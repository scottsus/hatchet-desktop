import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';

import { SensorDataV2 } from '../types/sensor-data';

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

export async function listenForSensorUpdates(
  onSensorData: (data: SensorDataV2) => void,
): Promise<() => void> {
  try {
    await invoke('start_data_streaming');
  } catch (error) {
    console.error('Failed to start data streaming:', error);
  }

  const unlisten = await listen<string>('sensor_data', (event) => {
    const response = event.payload;
    if (!response || response.includes('error')) {
      return;
    }

    const parsedData = parseSensorResponse(response);
    if (!parsedData) {
      return;
    }

    const sensorData: SensorDataV2 = {
      id: parsedData.userId,
      Latitude: parsedData.latitude,
      Longitude: parsedData.longitude,
      'Position Estimation Inertial Z': parsedData.inertialAltitude,
      'Altitude Estimation Pressometer': parsedData.barometricAltitude,
    };

    onSensorData(sensorData);
  });

  return unlisten;
}
