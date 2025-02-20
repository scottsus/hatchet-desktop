import { LngLatLike } from 'mapbox-gl';
import { PipeHandler } from './arianna-com';
import { CalibrationOpts, CrewMember } from '../types/crew';
import { SensorData } from '../types/sensor-data';
const EARTH_RADIUS_METERS = 6_378_137;
const DERGEES_PER_METER = 1 / (EARTH_RADIUS_METERS * (Math.PI / 180));

const pipe = new PipeHandler();
const memberInitState = new Map<string, boolean>();
const memberMessageCount = new Map<string, number>();

export async function calcCoordinates({
  data,
  member,
}: {
  data: SensorData;
  member: CrewMember;
}) {
  // Initialize tracking for new member
  if (!memberInitState.has(member.id)) {
    memberInitState.set(member.id, false);
    memberMessageCount.set(member.id, 0);
  }

  // Initialize pipe for member if needed
  if (!memberInitState.get(member.id)) {
    try {
      await pipe.sendCommand(`Init ${member.id}`);
      await pipe.sendCommand(
        `SetParameters ${member.id},0,0,0,0,0,1,${member.initialLat},${member.initialLon}`
      );
      memberInitState.set(member.id, true);
    } catch (error) {
      console.error('Pipe initialization failed:', error);
    }
  }

  let coordinates: LngLatLike;
  const currentCount = (memberMessageCount.get(member.id) || 0) + 1;
  memberMessageCount.set(member.id, currentCount);

  // Send sensor data
  await pipe.sendCommand(`Set ${data.thesia_string}`);

  // Get track every 10 messages
  const track = await pipe.sendCommand(`Get ${member.id}`);
  const [trackLon, trackLat] = track.split(',').map(Number);
  coordinates = [trackLon, trackLat];

  return {
    count: data['Message Counter'],
    temperature: data.Temperature,
    x: data['Position Estimation Inertial X'],
    y: data['Position Estimation Inertial Y'],
    coordinates
  };
}


// // Cleanup on process exit
// process.on('exit', () => {
//   if (isInitialized) {
//     pipe.disconnect();
//   }
// });

// export function calcCoordinates({
//   data,
//   member,
// }: {
//   data: SensorData;
//   member: CrewMember;
// }) {
//   const count = data['Message Counter'];
//   const temperature = data.Temperature;

//   const lon = data.Longitude;
//   const lat = data.Latitude;
//   const initialLat = member.initialLat ?? lat;
//   const initialLon = member.initialLon ?? lon;
//   const x = data['Position Estimation Inertial X'];
//   const y = data['Position Estimation Inertial Y'];
//   let dx = y;
//   let dy = x;

//   const coordinates = recalcCoordinates(
//     dx,
//     dy,
//     initialLat,
//     initialLon,
//     member.calibrationOpts,
//   );

//   return { count, temperature, x, y, coordinates };
// }

// function recalcCoordinates(
//   posX: number,
//   posY: number,
//   initialLat: number,
//   initialLon: number,
//   calibrationOpts?: CalibrationOpts,
// ): LngLatLike {
//   const rotationAngle = calibrationOpts?.rotationAngle ?? 0;
//   const shrinkFactorX = calibrationOpts?.shrinkFactorX ?? 1;
//   const shrinkFactorY = calibrationOpts?.shrinkFactorY ?? 1;

//   const rotatedDx =
//     posX * Math.cos((Math.PI * rotationAngle) / 180) -
//     posY * Math.sin((Math.PI * rotationAngle) / 180);
//   const rotatedDy =
//     posX * Math.sin((Math.PI * rotationAngle) / 180) +
//     posY * Math.cos((Math.PI * rotationAngle) / 180);

//   const shrunkDx = rotatedDx * shrinkFactorX;
//   const shrunkDy = rotatedDy * shrinkFactorY;

//   const deltaLat = metersToDegrees(shrunkDy, initialLat);
//   const deltaLon = metersToDegrees(shrunkDx, initialLat);

//   const newLat = initialLat + deltaLat;
//   const newLon = initialLon + deltaLon;

//   return [newLon, newLat];
// }

// function metersToDegrees(meters: number, atLatitude: number): number {
//   return (meters * DERGEES_PER_METER) / Math.cos(atLatitude * (Math.PI / 180));
// }