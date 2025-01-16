'use client';

import { sleep } from '@/src/lib/utils';
import mapboxgl, { MapOptions } from 'mapbox-gl';
import { useEffect, useRef } from 'react';

const earth_radius = 6378137; // Radius of the Earth in meters
const degrees_per_meter = 1 / (earth_radius * (Math.PI / 180));

function metersToDegrees(meters: number, atLatitude: number): number {
  return meters * degrees_per_meter / Math.cos(atLatitude * (Math.PI / 180));
}

function calculateNewCoordinates(
  posX: number,
  posY: number,
  initialLat: number,
  initialLon: number,
  rotationAngle: number,
  shrinkFactorX: number,
  shrinkFactorY: number
): [number, number] {
  // Rotate the delta
  const rotatedDx = posX * Math.cos(Math.PI * rotationAngle / 180) + posY * Math.sin(Math.PI * rotationAngle / 180);
  const rotatedDy = -posX * Math.sin(Math.PI * rotationAngle / 180) + posY * Math.cos(Math.PI * rotationAngle / 180);

  // Shrink the delta
  const shrunkDx = rotatedDx * shrinkFactorX;
  const shrunkDy = rotatedDy * shrinkFactorY;

  // Convert displacement to degrees
  const deltaLat = metersToDegrees(shrunkDy, initialLat);
  const deltaLon = metersToDegrees(shrunkDx, initialLat);

  // Calculate new coordinates
  const newLat = initialLat + deltaLat;
  const newLon = initialLon + deltaLon;

  return [newLon, newLat];
}

const mapboxConfig = (ref: any) =>
  ({
    container: ref,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-122.177495, 47.615030999999995],
    zoom: 18,
    attributionControl: false,
  }) as MapOptions;

export function Map() {
  const mapContainer = useRef<any>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    map.current = new mapboxgl.Map(mapboxConfig(mapContainer.current));

    map.current.on('load', () => {
      setTimeout(() => {
        loadCSVAndDrawPath(map.current!, marker.current);
      }, 3000);
    });
  }, []);

  return <div ref={mapContainer} className="size-full" />;
}

async function loadCSVAndDrawPath(
  map: mapboxgl.Map,
  marker: mapboxgl.Marker | null,
) {
  const response = await fetch('/apt4.1.csv');
  const csvText = await response.text();
  const lines = csvText.trim().split('\n');

  const coordinates: number[][] = [];

  map.addSource('route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coordinates,
      },
    },
  });

  map.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': '#ED7D31',
      'line-width': 2,
      'line-dasharray': [2, 1], // [dash length, gap length]
    },
  });

  const pos_est_inertial_x: number[] = [];
  const pos_est_inertial_y: number[] = [];
  const thesia_count: number[] = [];
  let initial_lat: number | null = 0;
  let initial_lon: number | null = 0;

  let count = 0;
  for (let i = 1; i < lines.length; i++) { // Start from 1 to skip the header line

    // Parse the CSV line
    console.log(lines[i]);
    const line = lines[i];
    const row = line.split(',');
    const x = parseFloat(row[17]);
    const y = parseFloat(row[18]);
    const count = parseInt(row[12]);
    if (!isNaN(x) && !isNaN(y)) {
      pos_est_inertial_x.push(x);
      pos_est_inertial_y.push(y);
      thesia_count.push(count);
    }

    // Get initial coordinates
    if (count > 0 && initial_lat === 0 && initial_lon === 0) {
      const lat = parseFloat(row[9]);
      const lon = parseFloat(row[10]);
      if (!isNaN(lat) && !isNaN(lon)) {
      initial_lat = lat;
      initial_lon = lon;
      }
    } else if (count < 1) {
      // Skip printing if thesia hasn't started
      continue;
    }

    let dx = -1 * pos_est_inertial_x[pos_est_inertial_x.length - 1];
    let dy = pos_est_inertial_y[pos_est_inertial_y.length - 1];

    const [new_lon, new_lat] = calculateNewCoordinates(
      dx,
      dy,
      initial_lat,
      initial_lon,
      90, // 90 degrees clockwise
      1,
      0.8
    );
    const coord = [new_lon, new_lat];
    coordinates.push(coord);

    await sleep(50);

    const source = map.getSource('route');
    if (source) {
      (source as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates,
        },
      });
    }

    if (marker) {
      marker.remove();
    }
    const markerElement = document.createElement('div');
    markerElement.classList.add(
      'marker',
      'bg-primary',
      'rounded-full',
      'w-2',
      'h-2'
    );
    new mapboxgl.Marker(markerElement).setLngLat([new_lon, new_lat]).addTo(map);
  }
}
