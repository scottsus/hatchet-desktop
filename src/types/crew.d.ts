import { SensorData } from './sensor-data';

export interface CrewMember {
  id: number;
  name: string;
  initials: string;
  color: string;
  time: string;
  signalStrength: 'low' | 'med' | 'high';
  temperature: number; // deprecated soon
  thesia_count: number;
  initialLat?: number;
  initialLon?: number;
  relative_elevation: number; // deprecated soon
  sensorSrc: string;
  sensorData: SensorData[];
  calibrationOpts?: CalibrationOpts;
}

export interface Team {
  name: string;
  color: string;
  crew: CrewMember[];
}

export interface CalibrationOpts {
  rotationAngle: number;
  shrinkFactorX: number;
  shrinkFactorY: number;
}
