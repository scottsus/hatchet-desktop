import { clearInterval } from 'timers';
import {
  mockDataSources,
  mockedCallDetails,
  mockedTeams,
} from '@/src/lib/mocks';
import { CrewMember, Team } from '@/src/types/crew';
import { SensorData } from '@/src/types/sensor-data';
import Papa from 'papaparse';
import { createContext, useContext, useEffect, useState } from 'react';

import { CallDetails } from '../dashboard/call';

type FiregroundContextType = {
  callDetails: CallDetails;
  teams: Team[];
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
  function updateSensorData(member: CrewMember, data: SensorData[]) {
    setTeams((prev) =>
      prev.map((team) => ({
        ...team,
        crew: team.crew.map((m) =>
          m === member ? { ...m, sensorData: data } : m,
        ),
      }))
    );
  }

  useEffect(() => {
    /**
     * mocks process of streaming data in realtime
     */
    async function loadSingularDataSource(dataSrc: string) {
      const INTERVAL = 400;

      const filename = dataSrc;
      const res = await fetch(filename);
      const csv = await res.text();
      const data = Papa.parse<SensorData>(csv, { header: true });
      const rows = data.data;

      let i = 0;
      const interval = setInterval(() => {
        setTeams((prevTeams) => {
          if (i < rows.length) {
            const target = prevTeams
              .flatMap((team) => team.crew)
              .find((m) => m.sensorSrc === dataSrc);
            if (target) {
              updateSensorData(target, [...target.sensorData, rows[i]]);
            }
            i++;
          }
          return prevTeams;
        });
      }, INTERVAL);

      return () => clearInterval(interval);
    }

    const dataSources = mockDataSources;
    dataSources.forEach(loadSingularDataSource);
  }, []);

  return (
    <FiregroundContext.Provider value={{ callDetails, teams }}>
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
