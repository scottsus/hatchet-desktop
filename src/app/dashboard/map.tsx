'use client';

import { sleep } from '@/src/lib/utils';
import { SatelliteIcon } from 'lucide-react';
import mapboxgl, { MapOptions } from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';

const earth_radius = 6378137; // Radius of the Earth in meters
const degrees_per_meter = 1 / (earth_radius * (Math.PI / 180));

function metersToDegrees(meters: number, atLatitude: number): number {
  return (meters * degrees_per_meter) / Math.cos(atLatitude * (Math.PI / 180));
}

function calculateNewCoordinates(
  posX: number,
  posY: number,
  initialLat: number,
  initialLon: number,
  rotationAngle: number,
  shrinkFactorX: number,
  shrinkFactorY: number,
): [number, number] {
  // Rotate the delta
  const rotatedDx =
    posX * Math.cos((Math.PI * rotationAngle) / 180) +
    posY * Math.sin((Math.PI * rotationAngle) / 180);
  const rotatedDy =
    -posX * Math.sin((Math.PI * rotationAngle) / 180) +
    posY * Math.cos((Math.PI * rotationAngle) / 180);

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

export function Map({
  updateCrewTemperature,
  updateCrewThesiaCount,
  updateCrewRelativeElevation,
}: {
  updateCrewTemperature: (index: number, temp: number) => void;
  updateCrewThesiaCount: (index: number, count: number) => void;
  updateCrewRelativeElevation: (index: number, elevation: number) => void;
}) {
  const mapContainer = useRef<any>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const [mapView, setMapView] = useState<'dark-v11' | 'satellite-v9'>(
    'dark-v11',
  );
  const toggleMapView = () => {
    const newStyle = mapView === 'dark-v11' ? 'satellite-v9' : 'dark-v11';
    setMapView(newStyle);
    if (map.current) {
      map.current.setStyle(`mapbox://styles/mapbox/${newStyle}`);
    }
  };

  useEffect(() => {
    if (map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    map.current = new mapboxgl.Map(mapboxConfig(mapContainer.current));

    map.current.on('load', () => {
      setTimeout(() => {
        loadCSVAndDrawPath(
          map.current!,
          marker.current,
          (temp) => updateCrewTemperature(0, temp),
          (temp) => updateCrewThesiaCount(0, temp),
          (temp) => updateCrewRelativeElevation(0, temp),
          '/apt2.csv',
          '#00FF00',
          'route1',
          'layer1',
          55,
          1,
          0.8,
        ); // Green
        loadCSVAndDrawPath(
          map.current!,
          marker.current,
          (temp) => updateCrewTemperature(1, temp),
          (temp) => updateCrewThesiaCount(1, temp),
          (temp) => updateCrewRelativeElevation(1, temp),
          '/apt4.1.csv',
          '#FFA500',
          'route2',
          'layer2',
          90,
          1,
          0.8,
        ); // Orange
        loadCSVAndDrawPath(
          map.current!,
          marker.current,
          (temp) => updateCrewTemperature(2, temp),
          (temp) => updateCrewThesiaCount(2, temp),
          (temp) => updateCrewRelativeElevation(2, temp),
          '/apt3.csv',
          '#800080',
          'route3',
          'layer3',
          105,
          0.9,
          0.8,
        ); // Purple
      }, 3000);
    });
  }, [
    updateCrewTemperature,
    updateCrewThesiaCount,
    updateCrewRelativeElevation,
  ]);

  return (
    <div className="size-full">
      <div ref={mapContainer} className="size-full" />
      <button
        className="absolute bottom-12 right-12 rounded-full bg-gray-700 p-2 hover:brightness-125"
        onClick={toggleMapView}
      >
        <SatelliteIcon />
      </button>
    </div>
  );
}

async function loadCSVAndDrawPath(
  map: mapboxgl.Map,
  marker: mapboxgl.Marker | null,
  setTemperature: (temperature: number) => void,
  setThesiaCount: (thesia_count: number) => void,
  setRelativeElevation: (relative_elevation: number) => void,
  csvUrl: string,
  lineColor: string,
  sourceId: string,
  layerId: string,
  rotationAngle: number,
  shrinkFactorX: number,
  shrinkFactorY: number,
) {
  const response = await fetch(csvUrl);
  const csvText = await response.text();
  const lines = csvText.trim().split('\n');

  const coordinates: number[][] = [];

  map.addSource(sourceId, {
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
    id: layerId,
    type: 'line',
    source: sourceId,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': lineColor,
      'line-width': 2,
      'line-dasharray': [2, 1], // [dash length, gap length]
    },
  });

  const pos_est_inertial_x: number[] = [];
  const pos_est_inertial_y: number[] = [];
  const pos_est_inertial_z: number[] = [];
  const thesia_count: number[] = [];
  const temperatures: number[] = [];
  let initial_lat: number | null = 0;
  let initial_lon: number | null = 0;

  for (let i = 1; i < lines.length; i++) {
    // Start from 1 to skip the header line

    // Parse the CSV line
    const line = lines[i];
    const row = line.split(',');
    const x = parseFloat(row[17]);
    const y = parseFloat(row[18]);
    const count = parseInt(row[12]);
    temperatures.push(parseFloat(row[0])); // Assuming temperature is in the first column
    if (!isNaN(x) && !isNaN(y)) {
      pos_est_inertial_x.push(x);
      pos_est_inertial_y.push(y);
      pos_est_inertial_z.push(parseFloat(row[19]));
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
      rotationAngle,
      shrinkFactorX,
      shrinkFactorY,
    );
    const coord = [new_lon, new_lat];
    coordinates.push(coord);

    await sleep(200);

    // Update the dashboard
    // Update the temperature with the last value in the temperatures array
    setTemperature(temperatures[temperatures.length - 1]);
    setThesiaCount(thesia_count[thesia_count.length - 1]);
    setRelativeElevation(pos_est_inertial_z[pos_est_inertial_z.length - 1]);

    const source = map.getSource(sourceId);
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
    markerElement.classList.add('marker', 'rounded-full', 'w-2', 'h-2');
    markerElement.style.backgroundColor = lineColor;
    new mapboxgl.Marker(markerElement).setLngLat([new_lon, new_lat]).addTo(map);
  }
}
