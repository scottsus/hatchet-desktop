'use client';

import mapboxgl, { MapOptions } from 'mapbox-gl';
import { useEffect, useRef } from 'react';

const mapboxConfig = (ref: any) =>
  ({
    container: ref,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-122.177495, 47.615030999999995],
    zoom: 21,
    attributionControl: false,
  }) as MapOptions;

export function Map() {
  const mapContainer = useRef<any>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    map.current = new mapboxgl.Map(mapboxConfig(mapContainer.current));

    map.current.on('load', () => {
      loadCSVAndDrawPath(map.current!);
    });
  }, []);

  return <div ref={mapContainer} className="size-full" />;
}

async function loadCSVAndDrawPath(map: mapboxgl.Map) {
  const response = await fetch('/sample_coords.txt');
  const csvText = await response.text();
  const coordinates = csvText
    .trim()
    .split('\n')
    .map((line) => {
      const [lon, lat] = line.split(',').map(Number).reverse();
      return [lon, lat * -1];
    });

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
      'line-color': '#888',
      'line-width': 8,
    },
  });
}
