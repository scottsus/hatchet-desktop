import { DEMO_INITIAL_CENTER } from "@/src/env";
import { listenForSensorUpdates } from "@/src/lib/fetch-data";
import { mockedCallDetails } from "@/src/lib/mocks";
import { CrewMember, Team } from "@/src/types/crew";
import { SensorDataV2, SensorDataWithCrew } from "@/src/types/sensor-data";
import { LngLatLike } from "mapbox-gl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { CallDetails } from "../dashboard/call";

// Context type definition
type FiregroundContextType = {
  callDetails: CallDetails;
  teams: Team[];
  getLatestSensorData: (memberId: number) => SensorDataV2 | undefined;
  getAllSensorUpdates: () => Map<number, SensorDataWithCrew>;
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
  // State initialization
  const [teams, setTeams] = useState<Team[]>([]);
  const [allSensorUpdates, setAllSensorUpdates] = useState<
    Map<number, SensorDataWithCrew>
  >(new Map());
  const [mapCenter, setMapCenter] = useState<LngLatLike>(
    DEMO_INITIAL_CENTER as LngLatLike,
  );

  // Find a crew member by ID
  const findCrewMember = useCallback(
    (memberId: number): CrewMember | undefined => {
      for (const team of teams) {
        const member = team.crew.find((m) => m.id === memberId);
        if (member) {
          return member;
        }
      }
      return undefined;
    },
    [teams],
  );

  // Update sensor data for a crew member
  const updateSensorData = useCallback(
    (member: CrewMember, newData: SensorDataV2) => {
      setTeams((prev) => {
        const teamIndex = prev.findIndex((team) =>
          team.crew.some((m) => m.id === member.id),
        );

        if (teamIndex === -1) return prev;

        const newTeams = [...prev];
        const team = { ...newTeams[teamIndex] };
        const memberIndex = team.crew.findIndex((m) => m.id === member.id);

        team.crew = [...team.crew];
        team.crew[memberIndex] = {
          ...member,
          initialLat: member.initialLat ?? newData.Latitude,
          initialLon: member.initialLon ?? newData.Longitude,
          sensorData: [...member.sensorData, newData],
        };

        newTeams[teamIndex] = team;
        return newTeams;
      });

      setAllSensorUpdates((prev) => {
        const newMap = new Map(prev);
        newMap.set(member.id, {
          sensorData: newData,
          crewMember: member,
        });
        return newMap;
      });
    },
    [],
  );

  // Helper functions for accessing data
  const getAllSensorUpdates = useCallback(() => {
    return allSensorUpdates;
  }, [allSensorUpdates]);

  const getLatestSensorData = useCallback(
    (memberId: number) => {
      const crewMember = findCrewMember(memberId);
      if (!crewMember || crewMember.sensorData.length === 0) return undefined;
      return crewMember.sensorData[crewMember.sensorData.length - 1];
    },
    [findCrewMember],
  );

  // Map center control
  const reCenter = useCallback(
    (center: LngLatLike) => setMapCenter(center),
    [],
  );

  // Listen for sensor data events
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupSensorListener = async () => {
      try {
        unlisten = await listenForSensorUpdates((sensorData) => {
          const memberId = sensorData.id;
          let member = findCrewMember(memberId);

          // If member doesn't exist, create a dynamic one
          if (!member) {
            const newMember = {
              id: memberId,
              name: `Firefighter ${memberId}`,
              initials: `FF${memberId}`,
              color: memberId === 89 ? "#9259A0" : "#AE8C5A",
              time: "0:0:0",
              signalStrength: "high" as const,
              temperature: 0,
              thesia_count: 0,
              relative_elevation: 1,
              sensorSrc: `user_${memberId}.csv`,
              sensorData: [],
            };

            setTeams((prev) => {
              const memberExists = prev.some((team) =>
                team.crew.some((crewMember) => crewMember.id === memberId),
              );
              if (memberExists) {
                return prev;
              }

              const newTeams = [...prev];
              if (newTeams.length > 0) {
                newTeams[0] = {
                  ...newTeams[0],
                  crew: [...newTeams[0].crew, newMember],
                };
              }
              return newTeams;
            });

            member = newMember;
          }

          updateSensorData(member, sensorData);
        });
      } catch (error) {
        console.error("Failed to setup sensor listener:", error);
      }
    };

    setupSensorListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [findCrewMember, updateSensorData]);

  // Provide context
  return (
    <FiregroundContext.Provider
      value={{
        callDetails: mockedCallDetails,
        teams,
        getLatestSensorData,
        getAllSensorUpdates,
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
  if (!context) {
    throw new Error("useFireground must be used within a FiregroundProvider");
  }
  return context;
}
