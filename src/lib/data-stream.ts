import Papa from 'papaparse';

import { INTERVAL } from '../env';
import { SensorData } from '../types/sensor-data';
import { mockedDataSources } from './mocks';
import { SensorDataBuffer } from './sensor-data-buffer';
import { sleep } from './utils';

export async function startMockedLoadDataAndStartStreaming() {
  const dataSources = mockedDataSources;
  const sensorDataBuffer = SensorDataBuffer.getInstance();

  const allCrews: SensorData[][] = await Promise.all(
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
    const nonEmptyQueueIndices = allCrews.reduce(
      (acc: number[], member, idx) => {
        if (member.length > 0) {
          acc.push(idx);
        }
        return acc;
      },
      [],
    );
    if (nonEmptyQueueIndices.length === 0) {
      break;
    }

    const randomIdx = Math.floor(Math.random() * nonEmptyQueueIndices.length);
    const crewMemberIdx = nonEmptyQueueIndices[randomIdx];
    const crewMember = allCrews[crewMemberIdx];
    const sensorData = crewMember.shift();
    if (!sensorData) {
      continue;
    }
    await sensorDataBuffer.push({
      ...sensorData!,
      id: dataSources[crewMemberIdx],
    });

    // Ensure data is produced at the same rate it's consumed
    await sleep(INTERVAL);
  }
}
