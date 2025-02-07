'use client';

import { FireFighterCircle } from '@/src/components/ff-circle';
import { sleep } from '@/src/lib/utils';
import { RouteIcon, SatelliteIcon } from 'lucide-react';
import mapboxgl, { LngLatLike, MapOptions } from 'mapbox-gl';
import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const EARTH_RADIUS_METERS = 6_378_137;
const DERGEES_PER_METER = 1 / (EARTH_RADIUS_METERS * (Math.PI / 180));

const sampleData = [
  {
    initials: 'AF',
    filename: '/apt2.csv',
    color: '#3880A9',
    route: 'route1',
    layer: 'layer1',
    rotationAngle: 35,
    shrinkFactorX: 1,
    shrinkFactorY: 0.8,
  },
  {
    initials: 'RT',
    filename: '/apt4.1.csv',
    color: '#3880A9',
    route: 'route2',
    layer: 'layer2',
    rotationAngle: 0,
    shrinkFactorX: 1,
    shrinkFactorY: 0.8,
  },
  {
    initials: 'DL',
    filename: '/apt3.csv',
    color: '#3880A9',
    route: 'route3',
    layer: 'layer3',
    rotationAngle: -15,
    shrinkFactorX: 0.9,
    shrinkFactorY: 0.8,
  },
  {
    initials: 'SS',
    filename: '/level.csv',
    color: '#9259A0',
    route: 'route4',
    layer: 'layer4',
    rotationAngle: -120,
    shrinkFactorX: 1,
    shrinkFactorY: 0.8,
  },
  {
    initials: 'AA',
    filename: '/level4.csv',
    color: '#AE8C5A',
    route: 'route5',
    layer: 'layer5',
    rotationAngle: 185,
    shrinkFactorX: 1,
    shrinkFactorY: 0.8,
  },
  {
    initials: 'AC',
    filename: '/level5.csv',
    color: '#AE8C5A',
    route: 'route6',
    layer: 'layer6',
    rotationAngle: 165,
    shrinkFactorX: 1,
    shrinkFactorY: 0.8,
  },
];

const mapboxConfig = (ref: any) =>
  ({
    container: ref,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-122.177495, 47.615030999999995],
    zoom: 18,
    attributionControl: false,
  }) as MapOptions;

export function Map({}: {}) {
  const mapContainer = useRef<any>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<(mapboxgl.Marker | null)[]>([]);

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

  const toggleTrails = () => {
    const layers = ['layer1', 'layer2', 'layer3'];
    layers.forEach((layerId) => {
      const layer = map.current?.getLayer(layerId);
      if (layer) {
        const isVisible = map.current?.getLayoutProperty(layerId, 'visibility');
        map.current?.setLayoutProperty(
          layerId,
          'visibility',
          isVisible === 'visible' ? 'none' : 'visible',
        );
      }
    });
  };

  useEffect(() => {
    if (map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    map.current = new mapboxgl.Map(mapboxConfig(mapContainer.current));

    map.current.on('load', () => {
      markers.current = Array(3).fill(null);

      setTimeout(() => {
        sampleData.forEach((data, index) => {
          loadCSVAndDrawPath({
            index,
            data: {
              csvUrl: data.filename,
              sourceId: data.route,
              layerId: data.layer,
              rotationAngle: data.rotationAngle,
              shrinkFactorX: data.shrinkFactorX,
              shrinkFactorY: data.shrinkFactorY,
              initials: data.initials,
            },
            mapOpts: {
              map: map.current!,
              markers,
              lineColor: data.color,
            },
          });
        });
      }, 3000);
    });
  }, []);

  return (
    <div className="relative size-full">
      <div ref={mapContainer} className="size-full" />
      <div className="absolute bottom-4 right-5 flex gap-x-4">
        <button
          className="cursor-pointer rounded-full bg-gray-700 p-2 hover:brightness-125"
          onClick={toggleMapView}
        >
          <SatelliteIcon />
        </button>
        <button
          className="cursor-pointer rounded-full bg-gray-700 p-2 hover:brightness-125"
          onClick={toggleTrails}
        >
          <RouteIcon />
        </button>
      </div>
    </div>
  );
}

async function loadCSVAndDrawPath({
  index,
  data,
  mapOpts,
}: {
  index: number;
  data: {
    csvUrl: string;
    sourceId: string;
    layerId: string;
    rotationAngle: number;
    shrinkFactorX: number;
    shrinkFactorY: number;
    initials: string;
  };
  mapOpts: {
    map: mapboxgl.Map;
    markers: MutableRefObject<(mapboxgl.Marker | null)[]>;
    lineColor: string;
  };
}) {
  const {
    csvUrl,
    sourceId,
    layerId,
    rotationAngle,
    shrinkFactorX,
    shrinkFactorY,
    initials,
  } = data;
  const { map, markers, lineColor } = mapOpts;

  const response = await fetch(csvUrl);
  const csvText = await response.text();
  const lines = csvText.trim().split('\n');

  const coordinates: LngLatLike[] = [];

  map.addSource(sourceId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coordinates as number[][],
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
      'line-dasharray': [3, 2], // [dash length, gap length]
    },
  });

  const pos_est_inertial_x: number[] = [];
  const pos_est_inertial_y: number[] = [];
  const pos_est_inertial_z: number[] = [];
  const thesia_count: number[] = [];
  const temperatures: number[] = [];
  let initial_lat: number | null = 0;
  let initial_lon: number | null = 0;

  // Start from 1 to skip the header line
  for (let i = 1; i < lines.length; i++) {
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

    let dx = pos_est_inertial_y[pos_est_inertial_y.length - 1];
    let dy = pos_est_inertial_x[pos_est_inertial_x.length - 1];

    const coords = calculateNewCoordinates(
      dx,
      dy,
      initial_lat,
      initial_lon,
      rotationAngle,
      shrinkFactorX,
      shrinkFactorY,
    );
    coordinates.push(coords);

    await sleep(200);

    const source = map.getSource(sourceId);
    if (source) {
      (source as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates as number[][],
        },
      });
    }

    updateMarker({ initials, lngLat: coords as LngLatLike, markers });
  }

  function calculateNewCoordinates(
    posX: number,
    posY: number,
    initialLat: number,
    initialLon: number,
    rotationAngle: number,
    shrinkFactorX: number,
    shrinkFactorY: number,
  ): LngLatLike {
  // Rotate the offset coordinates by the north alignment angle in degrees
  const rotatedDx =
    posX * Math.cos((Math.PI * rotationAngle) / 180) -
    posY * Math.sin((Math.PI * rotationAngle) / 180);
  const rotatedDy =
    posX * Math.sin((Math.PI * rotationAngle) / 180) +
    posY * Math.cos((Math.PI * rotationAngle) / 180);

  // // Rotate the offset coordinates by the north orientation correction angle in radian
  // const rotatedDx =
  //   posX * Math.cos(rotationAngle) - posY * Math.sin(rotationAngle);
  // const rotatedDy =
  //   posX * Math.sin(rotationAngle) + posY * Math.cos(rotationAngle);

  // rotatedDx an dy but input was radians
  console.log(data.initials,((180 * rotationAngle) / Math.PI));

  // Apply shrink factors
  const shrunkDx = rotatedDx * shrinkFactorX;
  const shrunkDy = rotatedDy * shrinkFactorY;

  // Convert the rotated offsets from meters to degrees
  const deltaLat = metersToDegrees(shrunkDy, initialLat);
  const deltaLon = metersToDegrees(shrunkDx, initialLat);

  // Add the converted offsets to the starting point latitude and longitude
  const newLat = initialLat + deltaLat;
  const newLon = initialLon + deltaLon;

    return [newLon, newLat];
  }
  function updateMarker({
    initials,
    lngLat,
    markers,
  }: {
    initials: string;
    lngLat: LngLatLike;
    markers: MutableRefObject<(mapboxgl.Marker | null)[]>;
  }) {
    if (markers.current[index]) {
      markers.current[index].remove();
    }
    const markerElement1 = (
      <FireFighterCircle color={lineColor} initials={initials} />
    );
    const staticElement = renderToStaticMarkup(markerElement1);
    const markerElement = document.createElement('div');
    markerElement.innerHTML = staticElement;

    const mapboxMarker = new mapboxgl.Marker(markerElement)
      .setLngLat(lngLat)
      .addTo(map);
    markers.current[index] = mapboxMarker;
  }
}

function metersToDegrees(meters: number, atLatitude: number): number {
  return (meters * DERGEES_PER_METER) / Math.cos(atLatitude * (Math.PI / 180));
}
