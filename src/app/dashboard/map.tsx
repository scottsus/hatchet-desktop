'use client';

import { sleep } from '@/src/lib/utils';
import mapboxgl, { MapOptions } from 'mapbox-gl';
import { useEffect, useRef } from 'react';

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
  const response = await fetch('/sample_coords.txt');
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

  for (const line of lines) {
    const [lon, lat] = line.split(',').map(Number).reverse();
    const coord = [lon, lat * -1];
    coordinates.push(coord);

    await sleep(100);

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
    console.log(lon, lat);

    if (marker) {
      marker.remove();
    }
    const markerElement = document.createElement('div');
    markerElement.classList.add(
      'marker',
      'bg-primary',
      'rounded-full',
      'w-2',
      'h-2',
    );
    marker = new mapboxgl.Marker({
      element: markerElement,
    })
      .setLngLat([lon, lat * -1])
      .addTo(map);
  }
}
