import { invoke } from '@tauri-apps/api/tauri';

import { DEFAULT_USER_ID } from '../env';
import { SensorDataWithId } from '../types/sensor-data';

interface ParsedSensorResponse {
  userId: number;
  latitude: number;
  longitude: number;
  inertialAltitude: number;
  barometricAltitude: number;
}

function parseSensorResponse(response: string): ParsedSensorResponse | null {
  const trimmedResponse = response.trim();
  const parts = trimmedResponse.split(':');

  if (parts.length !== 2) {
    console.error('Invalid data format: expected "userId:values"');
    return null;
  }

  const userId = parseInt(parts[0], 10);
  if (isNaN(userId)) {
    console.error('Invalid user ID format');
    return null;
  }

  const values = parts[1].split(',');
  if (values.length < 5) {
    console.error('Insufficient data values: expected at least 5 values');
    return null;
  }

  const latitude = parseFloat(values[1]);
  const longitude = parseFloat(values[2]);
  const inertialAltitude = parseFloat(values[3]);
  const barometricAltitude = parseFloat(values[4]);

  if ([latitude, longitude, inertialAltitude, barometricAltitude].some(isNaN)) {
    console.error('Invalid numeric values in sensor data');
    return null;
  }

  return {
    userId,
    latitude,
    longitude,
    inertialAltitude,
    barometricAltitude,
  };
}

export async function fetchSensorData(): Promise<SensorDataWithId | null> {
  try {
    const userId = DEFAULT_USER_ID;

    const isInitialized = await invoke<boolean>('is_user_initialized', {
      userId,
    });
    if (!isInitialized) {
      console.log(
        `User ${userId} not initialized in server. Skipping data fetch.`,
      );
      return null;
    }

    const response = await invoke<string>('fetch_last_position', { userId });
    if (!response || response.includes('error')) {
      console.log('Skipping function due to error response');
      return null;
    }

    const parsedData = parseSensorResponse(response);
    if (!parsedData) {
      return null;
    }

    const sensorDataWithId: SensorDataWithId = {
      id: parsedData.userId,
      Latitude: parsedData.latitude,
      Longitude: parsedData.longitude,
      'Position Estimation Inertial Z': parsedData.inertialAltitude,
      'Altitude Estimation Pressometer': parsedData.barometricAltitude,
    };

    return sensorDataWithId;
  } catch (error) {
    console.error('Failed to fetch sensor data:', error);
    return null;
  }
}
