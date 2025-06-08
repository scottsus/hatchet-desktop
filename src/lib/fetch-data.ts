import { invoke } from '@tauri-apps/api/tauri';

import { SensorData, SensorDataWithId } from '../types/sensor-data';

// export async function fetchSensorData(): Promise<SensorDataWithId | null> {
//   try {
//     const response = await invoke<string>('fetch_tcp_data');

//     const sensorData = parseCSVToSensorDataV2(response.trim());
//     const sensorDataWithId: SensorDataWithId = {
//       ...sensorData,
//       id: 'level.csv',
//     };
//     console.log('withId:', sensorDataWithId);

//     return sensorDataWithId;
//   } catch (error) {
//     console.error('Connection error:', error);
//     return null;
//   }
// }

export async function fetchSensorData(): Promise<SensorDataWithId | null> {
  try {
    const userId = 89; // MUST MATCH THE THESIA DEVICE ID
    
    // First check if the user is initialized in the server
    const isInitialized = await invoke<boolean>('is_user_initialized', { userId });
    
    if (!isInitialized) {
      console.log(`User ${userId} not initialized in server. Skipping data fetch.`);
      return null;
    }
    
    const response = await invoke<string>('fetch_last_position', { userId });
    
    // Check if response indicates an error
    if (!response || response.includes("error")) {
      console.log('Skipping function due to error response');
      return null;
    }

    const sensorData = response.trim();
    // Parse the response which should be in format: "userId:msgcount,latitude,longitude,zi,zp,zic"
    const parts = sensorData.split(':');
    
    if (parts.length !== 2) {
      console.error('Invalid data format');
      return null;
    }
    
    const valuesStr = parts[1].split(',');
    
    if (valuesStr.length < 5) {
      console.error('Insufficient data values');
      return null;
    }
    
    const userIdResp = parseInt(parts[0]);
    const msg_counter = parseInt(valuesStr[0]);
    const latitude = parseFloat(valuesStr[1]);
    const longitude = parseFloat(valuesStr[2]);
    const zi = parseFloat(valuesStr[3]); // Inertial Altitude
    const zp = parseFloat(valuesStr[4]); // Barometric Altitude
    const zic = parseFloat(valuesStr[5]); // Inertial Altitude fused with Barometric
    
    const sensorDataWithId: SensorDataWithId = {
      id: userIdResp,
      Temperature: 25.5, // default value
      Pressure: 1013.25, // default value
      Altitude: zp, // Using barometric altitude
      Day: new Date().getDate(),
      Month: new Date().getMonth() + 1,
      Year: new Date().getFullYear(),
      Hour: new Date().getHours(),
      Minute: new Date().getMinutes(),
      Second: new Date().getSeconds(),
      Latitude: latitude,
      Longitude: longitude,
      'Operator Id': userIdResp,
      'Message Counter': msg_counter,
      'Step Counter': 0,
      Flags: 0,
      'Position Estimation Inertial Magnetic X': 0,
      'Position Estimation Inertial Magnetic Y': 0,
      'Position Estimation Inertial X': 0,
      'Position Estimation Inertial Y': 0,
      'Position Estimation Inertial Z': zi, // Using inertial altitude for Z
      'Altitude Estimation Pressometer': zp, // Using barometric altitude
      'Latitude Estimation GPS': latitude,
      'Longitude Estimation GPS': longitude,
      'GPS Estimation Quality': 1,
      'North Alignment Angle Inertial Path': 0,
      'Yaw Drift Inertial Path': 0,
      'CRC-CCITT': 0,
      thesia_string: `zi:${zi},zp:${zp},zic:${zic}`,
    };
    console.log('withId:', sensorDataWithId);

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

function parseCSVToSensorDataV2(row: string): SensorData {
  // Extract data part after "data: " prefix if present
  const dataString = row.startsWith('data: ') ? row.substring(6) : row;

  const values = dataString.split(',');
  const latitude = parseFloat(values[0]);
  const longitude = parseFloat(values[1]);
  const thesiaString = values[2] || '';

  // Parse the thesia string if it exists and starts with #
  let posX = 0;
  let posY = 0;
  let messageCounter = 1; // Default to 1 to ensure data is processed

  if (thesiaString && thesiaString.startsWith('#')) {
    // Remove the # prefix
    const hexData = thesiaString.substring(1);

    try {
      // Extract position data from the hex string
      // Assuming the format follows a specific pattern where:
      // Position X is at bytes 22-25 (44-49 in hex string)
      // Position Y is at bytes 26-29 (52-57 in hex string)
      // These positions are estimates based on the sample data

      // Extract X position (4 bytes)
      if (hexData.length >= 50) {
        const xHex = hexData.substring(44, 52);
        // Convert from hex and handle two's complement for negative values
        const xVal = parseInt(xHex, 16);
        posX = xVal >= 0x80000000 ? xVal - 0x100000000 : xVal;
        posX = posX / 100; // Scale factor (adjust as needed)
      }

      // Extract Y position (4 bytes)
      if (hexData.length >= 58) {
        const yHex = hexData.substring(52, 60);
        // Convert from hex and handle two's complement for negative values
        const yVal = parseInt(yHex, 16);
        posY = yVal >= 0x80000000 ? yVal - 0x100000000 : yVal;
        posY = posY / 100; // Scale factor (adjust as needed)
      }

      // Extract message counter (assuming it's at a specific position)
      if (hexData.length >= 16) {
        messageCounter = parseInt(hexData.substring(12, 16), 16);
      }
    } catch (error) {
      console.error('Error parsing thesia string:', error);
    }
  }

  return {
    Temperature: 25.5, // mocked
    Pressure: 1013.25, // mocked
    Altitude: 100, // mocked
    Day: new Date().getDate(),
    Month: new Date().getMonth() + 1,
    Year: new Date().getFullYear(),
    Hour: new Date().getHours(),
    Minute: new Date().getMinutes(),
    Second: new Date().getSeconds(),
    Latitude: latitude, // real data
    Longitude: longitude, // real data
    'Operator Id': 1, // mocked
    'Message Counter': messageCounter, // extracted from thesia string
    'Step Counter': 0, // mocked
    Flags: 0, // mocked
    'Position Estimation Inertial Magnetic X': 0, // mocked
    'Position Estimation Inertial Magnetic Y': 0, // mocked
    'Position Estimation Inertial X': posX, // extracted from thesia string
    'Position Estimation Inertial Y': posY, // extracted from thesia string
    'Position Estimation Inertial Z': 0, // mocked
    'Altitude Estimation Pressometer': 0, // mocked
    'Latitude Estimation GPS': latitude, // same as Latitude
    'Longitude Estimation GPS': longitude, // same as Longitude
    'GPS Estimation Quality': 1, // mocked
    'North Alignment Angle Inertial Path': 0, // mocked
    'Yaw Drift Inertial Path': 0, // mocked
    'CRC-CCITT': 0, // mocked
    thesia_string: thesiaString, // store original thesia string
  };
}
