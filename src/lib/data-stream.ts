import Papa from 'papaparse';

import { INTERVAL } from '../env';
import { SensorData, SensorDataWithId } from '../types/sensor-data';
import { mockedDataSources } from './mocks';
import { sleep } from './utils';

export const sensorDataQueue: SensorDataWithId[] = [];
export let isStreamingComplete = false;

export async function startMockedLoadDataAndStartStreaming() {
  const dataSources = mockedDataSources;
  let currentCrewIndex = 0;

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

  // Randomly select a crew member to stream data from
  // while (!isStreamingComplete) {
  //   const nonEmptyQueueIndices = allCrews.reduce(
  //     (acc: number[], member, idx) => {
  //       if (member.length > 0) {
  //         acc.push(idx);
  //       }
  //       return acc;
  //     },
  //     [],
  //   );
    
  //   if (nonEmptyQueueIndices.length === 0) {
  //     isStreamingComplete = true;
  //     break;
  //   }

  //   const randomIdx = Math.floor(Math.random() * nonEmptyQueueIndices.length);
  //   const crewMemberIdx = nonEmptyQueueIndices[randomIdx];
  //   const crewMember = allCrews[crewMemberIdx];
  //   const sensorData = crewMember.shift();
    
  //   if (!sensorData) {
  //     continue;
  //   }
    
  //   if (!isStreamingComplete) {
  //     sensorDataQueue.push({ ...sensorData, id: dataSources[crewMemberIdx] });
  //   }

  // Alternate between crew members 1 2 3 1 2 3 ...
  while (!isStreamingComplete) {
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
      isStreamingComplete = true;
      break;
    }

    // Find next valid crew member
    while (!allCrews[currentCrewIndex]?.length) {
      currentCrewIndex = (currentCrewIndex + 1) % allCrews.length;
    }

    const crewMember = allCrews[currentCrewIndex];
    const sensorData = crewMember.shift();
    
    if (!sensorData) {
      continue;
    }
    
    if (!isStreamingComplete) {
      sensorDataQueue.push({ ...sensorData, id: dataSources[currentCrewIndex] });
    }

    // Move to next crew member
    currentCrewIndex = (currentCrewIndex + 1) % allCrews.length;

    // @TODO: add lock
    // await sleep(INTERVAL);
  }
}

export function isDataStreamingComplete(): boolean {
  return isStreamingComplete;
}