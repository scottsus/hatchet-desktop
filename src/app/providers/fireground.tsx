import {
  DEMO_INITIAL_CENTER,
  INTERVAL,
  USE_ACTUAL_TCP_SERVER,
} from '@/src/env';
import {
  sensorDataQueue,
  startMockedLoadDataAndStartStreaming,
} from '@/src/lib/data-stream';
import { fetchSensorData } from '@/src/lib/fetch-data';
import { mockedCallDetails, mockedTeams } from '@/src/lib/mocks';
import { CrewMember, Team } from '@/src/types/crew';
import { SensorData, SensorDataWithCrew } from '@/src/types/sensor-data';
import { LngLatLike } from 'mapbox-gl';
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
  getLatestSensorData: (memberId: number) => SensorData | undefined;
  mapCenter: LngLatLike;
  reCenter: (center: LngLatLike) => void;
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
  const [mapCenter, setMapCenter] = useState<LngLatLike>(
    DEMO_INITIAL_CENTER as LngLatLike,
  );

  function updateSensorData(member: CrewMember, newData: SensorData) {
    if (newData['Message Counter'] > 0 || USE_ACTUAL_TCP_SERVER) {
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
              : m,
          ),
        })),
      );
    }
  }

  const getLatestSensorDataWithCrew = useCallback(
    () => latestSensorData,
    [latestSensorData],
  );

  const getLatestSensorData = useCallback(
    (memberId: number) => {
      const crewMember = teams
        .flatMap((team) => team.crew)
        .find((member) => member.id === memberId);
      if (!crewMember) {
        return undefined;
      }

      return crewMember.sensorData[crewMember.sensorData.length - 1];
    },
    [teams],
  );

  const reCenter = (center: LngLatLike) => {
    setMapCenter(center);
  };

  useEffect(() => {
    if (!USE_ACTUAL_TCP_SERVER) {
      startMockedLoadDataAndStartStreaming();
    }

    const interval = setInterval(async () => {
      let sensorData: any;
      if (USE_ACTUAL_TCP_SERVER) {
        sensorData = await fetchSensorData();
      } else {
        if (sensorDataQueue.length > 0) {
          sensorData = sensorDataQueue.shift();
        }
      }

      const targetCrewMember = teams
        .flatMap((team) => team.crew)
        .find((m) => m.id === sensorData?.id);
      console.log('targetCrewMember:', targetCrewMember);
      if (targetCrewMember && sensorData) {
        console.log("WE FOUND A MAAATCH!!");
        updateSensorData(targetCrewMember, sensorData);
        setLatestSensorDataWithCrew({
          crewMember: targetCrewMember,
          sensorData,
        });
      }
    }, INTERVAL);

    return () => clearInterval(interval);
  }, [teams]);

  return (
    <FiregroundContext.Provider
      value={{
        callDetails,
        teams,
        getLatestSensorDataWithCrew,
        getLatestSensorData,
        mapCenter,
        reCenter,
      }}
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
