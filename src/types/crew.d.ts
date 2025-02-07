import { SensorData } from './sensor-data';

export interface CrewMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  time: string;
  signalStrength: 'low' | 'med' | 'high';
  temperature: number; // deprecated soon
  thesia_count: number; // deprecated soon
  relative_elevation: number; // deprecated soon
  sensorSrc: string;
  sensorData: SensorData[];
}

export interface Team {
  name: string;
  color: string;
  crew: CrewMember[];
}
