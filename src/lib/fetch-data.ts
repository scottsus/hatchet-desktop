import { invoke } from '@tauri-apps/api/tauri';

import { SensorData, SensorDataWithId } from '../types/sensor-data';

const HOST = 'localhost';
const PORT = 8080;

export async function fetchSensorData(): Promise<SensorDataWithId | null> {
  console.log(`Connecting to ${HOST}:${PORT} via Tauri...`);

  try {
    const response = await invoke<string>('fetch_tcp_data', {
      host: HOST,
      port: PORT,
    });

    console.log('Received:', response);

    const sensorData = parseCSVToSensorData(response.trim());
    const sensorDataWithId: SensorDataWithId = {
      ...sensorData,
      id: 'level.csv',
    };

    return sensorDataWithId;
  } catch (error) {
    console.error('Connection error:', error);
    return null;
  }
}

function parseCSVToSensorData(row: string): SensorData {
  const values = row.split(',');

  return {
    Temperature: parseFloat(values[0]),
    Pressure: parseFloat(values[1]),
    Altitude: parseFloat(values[2]),
    Day: parseInt(values[3]),
    Month: parseInt(values[4]),
    Year: parseInt(values[5]),
    Hour: parseInt(values[6]),
    Minute: parseInt(values[7]),
    Second: parseInt(values[8]),
    Latitude: parseFloat(values[9]),
    Longitude: parseFloat(values[10]),
    'Operator Id': parseInt(values[11]),
    'Message Counter': parseInt(values[12]),
    'Step Counter': parseInt(values[13]),
    Flags: parseInt(values[14]),
    'Position Estimation Inertial Magnetic X': parseFloat(values[15]),
    'Position Estimation Inertial Magnetic Y': parseFloat(values[16]),
    'Position Estimation Inertial X': parseFloat(values[17]),
    'Position Estimation Inertial Y': parseFloat(values[18]),
    'Position Estimation Inertial Z': parseFloat(values[19]),
    'Altitude Estimation Pressometer': parseFloat(values[20]),
    'Latitude Estimation GPS': parseFloat(values[21]),
    'Longitude Estimation GPS': parseFloat(values[22]),
    'GPS Estimation Quality': parseInt(values[23]),
    'North Alignment Angle Inertial Path': parseFloat(values[24]),
    'Yaw Drift Inertial Path': parseFloat(values[25]),
    'CRC-CCITT': parseInt(values[26]),
    thesia_string: values[27] || '',
  };
}

// fetchSensorData().then(console.log);
