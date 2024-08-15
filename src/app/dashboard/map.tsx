'use client';

import mapboxgl, { MapOptions } from 'mapbox-gl';
import { useEffect, useRef } from 'react';

const mapboxConfig = (ref: any) =>
  ({
    container: ref,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-122.435, 37.7609],
    zoom: 11.3,
    attributionControl: false,
  }) as MapOptions;

export function Map() {
  const mapContainer = useRef<any>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    map.current = new mapboxgl.Map(mapboxConfig(mapContainer.current));
  }, []);

  return <div ref={mapContainer} className="size-full" />;
}
