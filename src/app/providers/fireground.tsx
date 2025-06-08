import {
  DEMO_INITIAL_CENTER,
  INTERVAL,
  USE_ACTUAL_TCP_SERVER,
  RAW_DATA_TCP_IP,
  RAW_DATA_TCP_PORT,
} from '@/src/env';
import { fetchSensorData } from '@/src/lib/fetch-data';
import { mockedCallDetails, mockedTeams } from '@/src/lib/mocks';
import { CrewMember, Team } from '@/src/types/crew';
import { SensorData, SensorDataWithCrew } from '@/src/types/sensor-data';
import { LngLatLike } from 'mapbox-gl';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CallDetails } from '../dashboard/call';
import { invoke } from '@tauri-apps/api/tauri';

// Context type definition
type FiregroundContextType = {
  callDetails: CallDetails;
  teams: Team[];
  getLatestSensorDataWithCrew: () => SensorDataWithCrew | null;
  getLatestSensorData: (memberId: number) => SensorData | undefined;
  mapCenter: LngLatLike;
  reCenter: (center: LngLatLike) => void;
};

const FiregroundContext = createContext<FiregroundContextType | undefined>(undefined);

export function FiregroundProvider({ children }: { children: React.ReactNode }) {
  // State initialization
  const [teams, setTeams] = useState<Team[]>(mockedTeams);
  const [latestSensorData, setLatestSensorData] = useState<SensorDataWithCrew | null>(null);
  const [mapCenter, setMapCenter] = useState<LngLatLike>(DEMO_INITIAL_CENTER as LngLatLike);

  // Find a crew member by ID
  const findCrewMember = useCallback((memberId: number): CrewMember | undefined => {
    for (const team of teams) {
      const member = team.crew.find(m => m.id === memberId);
      if (member) return member;
    }
    return undefined;
  }, [teams]);

  // Update sensor data for a crew member
  const updateSensorData = useCallback((member: CrewMember, newData: SensorData) => {
    setTeams(prev => {
      const teamIndex = prev.findIndex(team => 
        team.crew.some(m => m.id === member.id));
      
      if (teamIndex === -1) return prev;
      
      const newTeams = [...prev];
      const team = {...newTeams[teamIndex]};
      const memberIndex = team.crew.findIndex(m => m.id === member.id);
      
      team.crew = [...team.crew];
      team.crew[memberIndex] = {
        ...member,
        initialLat: member.initialLat ?? newData.Latitude,
        initialLon: member.initialLon ?? newData.Longitude,
        sensorData: [...member.sensorData, newData]
      };
      
      newTeams[teamIndex] = team;
      return newTeams;
    });

    setLatestSensorData({
      crewMember: member,
      sensorData: newData,
    });
  }, []);

  // Helper functions for accessing data
  const getLatestSensorDataWithCrew = useCallback(() => latestSensorData, [latestSensorData]);
  
  const getLatestSensorData = useCallback((memberId: number) => {
    const crewMember = findCrewMember(memberId);
    if (!crewMember || crewMember.sensorData.length === 0) return undefined;
    return crewMember.sensorData[crewMember.sensorData.length - 1];
  }, [findCrewMember]);

  // Map center control
  const reCenter = useCallback((center: LngLatLike) => setMapCenter(center), []);

  // Initialize data streamer connection
  useEffect(() => {
    if (!USE_ACTUAL_TCP_SERVER) return;
    
    async function startDataStreamer() {
      try {
        await invoke('start_data_streamer', { 
          ip: RAW_DATA_TCP_IP,
          port: RAW_DATA_TCP_PORT
        });
      } catch (error) {
        console.error("Failed to start data streamer:", error);
      }
    }
    
    startDataStreamer();
    
    // Simple health check every 30 seconds
    const connectionCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await invoke<boolean>('check_connection_health');
        console.log("Connection health:", isHealthy ? "OK" : "FAILED");
      } catch (error) {
        console.error("Health check failed:", error);
      }
    }, 30000);
    
    return () => clearInterval(connectionCheckInterval);
  }, []);

  // Poll for sensor data
  useEffect(() => {
    if (!USE_ACTUAL_TCP_SERVER) return;
    
    const pollSensorData = async () => {
      try {
        const data = await fetchSensorData();
        if (!data) return;
        
        const { id, ...sensorData } = data;
        const memberId = typeof id === 'number' ? id : parseInt(id);
        const member = findCrewMember(memberId);
        
        if (member) {
          updateSensorData(member, sensorData);
        }
      } catch (error) {
        console.error("Failed to fetch sensor data:", error);
      }
    };
    
    pollSensorData();
    const interval = setInterval(pollSensorData, INTERVAL || 1000);
    return () => clearInterval(interval);
  }, [findCrewMember, updateSensorData]);

  // Provide context
  return (
    <FiregroundContext.Provider
      value={{
        callDetails: mockedCallDetails,
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
  if (!context) {
    throw new Error('useFireground must be used within a FiregroundProvider');
  }
  return context;
}