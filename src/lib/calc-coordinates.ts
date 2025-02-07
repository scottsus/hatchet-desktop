import { LngLatLike } from 'mapbox-gl';

import { SensorData } from '../types/sensor-data';

const EARTH_RADIUS_METERS = 6_378_137;
const DERGEES_PER_METER = 1 / (EARTH_RADIUS_METERS * (Math.PI / 180));

export function calcCoordinates({
  prev,
  data,
}: {
  prev: SensorData;
  data: SensorData;
}) {
  const count = data['Message Counter'];
  const temperature = data.Temperature;

  const lat = data.Latitude;
  const lon = data.Longitude;
  const initialLat = !isNaN(lat) ? lat : 0;
  const initialLon = !isNaN(lon) ? lon : 0;

  const x = data['Position Estimation Inertial X'];
  const y = data['Position Estimation Inertial Y'];

  let dx = y;
  let dy = x;

  const coordinates = recalcCoordinates(dx, dy, initialLat, initialLon);

  return { count, temperature, x, y, coordinates };
}

function recalcCoordinates(
  posX: number,
  posY: number,
  initialLat: number,
  initialLon: number,
  rotationAngle: number = 165,
  shrinkFactorX: number = 1,
  shrinkFactorY: number = 0.8,
): LngLatLike {
  const rotatedDx =
    posX * Math.cos((Math.PI * rotationAngle) / 180) +
    posY * Math.sin((Math.PI * rotationAngle) / 180);
  const rotatedDy =
    -posX * Math.sin((Math.PI * rotationAngle) / 180) +
    posY * Math.cos((Math.PI * rotationAngle) / 180);

  const shrunkDx = rotatedDx * shrinkFactorX;
  const shrunkDy = rotatedDy * shrinkFactorY;

  const deltaLat = metersToDegrees(shrunkDy, initialLat);
  const deltaLon = metersToDegrees(shrunkDx, initialLat);

  const newLat = initialLat + deltaLat;
  const newLon = initialLon + deltaLon;

  return [newLon, newLat];
}

function metersToDegrees(meters: number, atLatitude: number): number {
  return (meters * DERGEES_PER_METER) / Math.cos(atLatitude * (Math.PI / 180));
}
