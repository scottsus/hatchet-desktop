import { INTERVAL } from '@/src/env';
import {
  sensorDataQueue,
  startMockedLoadDataAndStartStreaming,
} from '@/src/lib/data-stream';
import { mockedCallDetails, mockedTeams } from '@/src/lib/mocks';
import { CrewMember, Team } from '@/src/types/crew';
import { SensorData, SensorDataWithCrew } from '@/src/types/sensor-data';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { CallDetails } from '../dashboard/call';

type FiregroundContextType = {
  callDetails: CallDetails;
  teams: Team[];
  getLatestSensorDataWithCrew: () => SensorDataWithCrew | null;
};

const FiregroundContext = createContext<FiregroundContextType | undefined>(
  undefined,
);

export function FiregroundProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const callDetails = mockedCallDetails;
  const initialTeams = mockedTeams;
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [latestSensorData, setLatestSensorDataWithCrew] =
    useState<SensorDataWithCrew | null>(null);

  function updateSensorData(member: CrewMember, newData: SensorData) {
    if (newData['Message Counter'] > 0) {
      setTeams((prev) =>
        prev.map((team) => ({
          ...team,
          crew: team.crew.map((m) =>
            m === member
              ? {
                  ...m,
                  initialLat: m.initialLat ?? newData.Latitude,
                  initialLon: m.initialLon ?? newData.Longitude,
                  thesia_count: newData['Message Counter'],
                  sensorData: [...m.sensorData, newData],
                }
              : m
          ),
        }))
      );
    }
  }

  const getLatestSensorDataWithCrew = useCallback(
    () => latestSensorData,
    [latestSensorData],
  );

  useEffect(() => {
    startMockedLoadDataAndStartStreaming();

    const interval = setInterval(() => {
      if (sensorDataQueue.length > 0) {
        const sensorData = sensorDataQueue.shift();
        const targetCrewMember = teams
          .flatMap((team) => team.crew)
          .find((m) => m.sensorSrc === sensorData?.id);
        if (targetCrewMember && sensorData) {
          updateSensorData(targetCrewMember, sensorData);
          setLatestSensorDataWithCrew({
            crewMember: targetCrewMember,
            sensorData,
          });
        }
      }
    }, INTERVAL);

    return () => clearInterval(interval);
  }, [teams]);

  return (
    <FiregroundContext.Provider
      value={{ callDetails, teams, getLatestSensorDataWithCrew }}
    >
      {children}
    </FiregroundContext.Provider>
  );
}

export function useFireground() {
  const context = useContext(FiregroundContext);
  if (context === undefined) {
    throw new Error(
      'useFireground must be used within a FiregroundContextProvider',
    );
  }

  return context;
}
