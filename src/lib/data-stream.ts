import Papa from 'papaparse';

import { INTERVAL } from '../env';
import { SensorData, SensorDataWithId } from '../types/sensor-data';
import { mockedDataSources } from './mocks';
import { sleep } from './utils';

export const sensorDataQueue: SensorDataWithId[] = [];

export async function startMockedLoadDataAndStartStreaming() {
  const dataSources = mockedDataSources;

  const allRows: SensorData[][] = await Promise.all(
    dataSources.map(async (dataSource) => {
      const filename = dataSource;
      const res = await fetch(filename);
      const csv = await res.text();
      const data = Papa.parse<SensorData>(csv, {
        header: true,
        dynamicTyping: true,
      });
      return data.data;
    }),
  );

  while (true) {
    const nonEmptyQueueIndices = allRows.reduce((acc: number[], queue, idx) => {
      if (queue.length > 0) {
        acc.push(idx);
      }
      return acc;
    }, []);
    if (nonEmptyQueueIndices.length === 0) {
      break;
    }

    const idx = Math.floor(Math.random() * nonEmptyQueueIndices.length);
    const randomQueueIdx = nonEmptyQueueIndices[idx];
    const queue = allRows[randomQueueIdx];
    const randomRow = queue.shift();
    if (!randomRow) {
      continue;
    }
    sensorDataQueue.push({ ...randomRow!, id: dataSources[randomQueueIdx] });

    await sleep(INTERVAL);
  }
}
