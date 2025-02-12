import { LngLatLike } from 'mapbox-gl';

import { CalibrationOpts } from '../types/crew';
import { SensorData } from '../types/sensor-data';

const EARTH_RADIUS_METERS = 6_378_137;
const DERGEES_PER_METER = 1 / (EARTH_RADIUS_METERS * (Math.PI / 180));

let initialLon = 0;
let initialLat = 0;

export function calcCoordinates({
  prev,
  data,
  calibrationOpts,
}: {
  prev: SensorData;
  data: SensorData;
  calibrationOpts?: CalibrationOpts;
}) {
  console.log(initialLon, initialLat);

  const count = data['Message Counter'];
  const temperature = data.Temperature;

  const lon = data.Longitude;
  const lat = data.Latitude;
  [initialLon, initialLat] = initializeCheckLonLat({
    initialLon,
    initialLat,
    lon,
    lat,
    count,
  });

  const x = data['Position Estimation Inertial X'];
  const y = data['Position Estimation Inertial Y'];

  let dx = y;
  let dy = x;

  const coordinates = recalcCoordinates(
    dx,
    dy,
    initialLat,
    initialLon,
    calibrationOpts,
  );

  return { count, temperature, x, y, coordinates };
}

function initializeCheckLonLat({
  initialLon,
  initialLat,
  lon,
  lat,
  count,
}: {
  initialLon: number;
  initialLat: number;
  lon: number;
  lat: number;
  count: number;
}) {
  if (initialLon !== 0 || initialLat !== 0) {
    return [initialLon, initialLat];
  }

  if (count === 0) {
    return [0, 0];
  }

  if (isNaN(lat) || isNaN(lon)) {
    return [0, 0];
  }

  return [lon, lat];
}

function recalcCoordinates(
  posX: number,
  posY: number,
  initialLat: number,
  initialLon: number,
  calibrationOpts?: CalibrationOpts,
): LngLatLike {
  const rotationAngle = calibrationOpts?.rotationAngle ?? 165;
  const shrinkFactorX = calibrationOpts?.shrinkFactorX ?? 1.0;
  const shrinkFactorY = calibrationOpts?.shrinkFactorY ?? 0.8;

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
