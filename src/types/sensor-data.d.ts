import { CrewMember } from './crew';

export type SensorDataWithId = SensorDataV2 & { id: number };
export type SensorDataWithCrew = {
  sensorData: SensorDataV2;
  crewMember: CrewMember;
};

export type SensorDataV2 = {
  Latitude: number;
  Longitude: number;
  'Position Estimation Inertial Z': number;
  'Altitude Estimation Pressometer': number;
};

export type SensorDataV1 = {
  Temperature: number;
  Pressure: number;
  Altitude: number;
  Day: number;
  Month: number;
  Year: number;
  Hour: number;
  Minute: number;
  Second: number;
  Latitude: number;
  Longitude: number;
  'Operator Id': number;
  'Message Counter': number;
  'Step Counter': number;
  Flags: number;
  'Position Estimation Inertial Magnetic X': number;
  'Position Estimation Inertial Magnetic Y': number;
  'Position Estimation Inertial X': number;
  'Position Estimation Inertial Y': number;
  'Position Estimation Inertial Z': number;
  'Altitude Estimation Pressometer': number;
  'Latitude Estimation GPS': number;
  'Longitude Estimation GPS': number;
  'GPS Estimation Quality': number;
  'North Alignment Angle Inertial Path': number;
  'Yaw Drift Inertial Path': number;
  'CRC-CCITT': number;
  thesia_string: string;
};
