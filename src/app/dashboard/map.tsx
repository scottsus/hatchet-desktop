'use client';

import { sleep } from '@/src/lib/utils';
import { SatelliteIcon } from 'lucide-react';
import mapboxgl, { LngLatLike, MapOptions } from 'mapbox-gl';
import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const EARTH_RADIUS_METERS = 6_378_137;
const DERGEES_PER_METER = 1 / (EARTH_RADIUS_METERS * (Math.PI / 180));

const sampleData = [
  {
    initials: 'AF',
    filename: '/apt2.csv',
    color: '#5EC166',
    route: 'route1',
    layer: 'layer1',
    rotationAngle: 55,
    shrinkFactorX: 1,
    shrinkFactorY: 0.8,
  },
  {
    initials: 'RT',
    filename: '/apt4.1.csv',
    color: '#C1995D',
    route: 'route2',
    layer: 'layer2',
    rotationAngle: 90,
    shrinkFactorX: 1,
    shrinkFactorY: 0.8,
  },
  {
    initials: 'SS',
    filename: '/apt3.csv',
    color: '#B35FC1',
    route: 'route3',
    layer: 'layer3',
    rotationAngle: 105,
    shrinkFactorX: 0.9,
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
            setters: {
              setTemperature: (temp) => updateCrewTemperature(index, temp),
              setThesiaCount: (count) => updateCrewThesiaCount(index, count),
              setRelativeElevation: (elevation) =>
                updateCrewRelativeElevation(index, elevation),
            },
          });
        });
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

async function loadCSVAndDrawPath({
  index,
  data,
  mapOpts,
  setters,
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
  setters: {
    setTemperature: (temperature: number) => void;
    setThesiaCount: (thesia_count: number) => void;
    setRelativeElevation: (relative_elevation: number) => void;
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
  const { setTemperature, setThesiaCount, setRelativeElevation } = setters;

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

    let dx = -1 * pos_est_inertial_x[pos_est_inertial_x.length - 1];
    let dy = pos_est_inertial_y[pos_est_inertial_y.length - 1];

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

    // Update the dashboard
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
      <div
        className="flex items-center justify-center rounded-full p-1"
        style={{ backgroundColor: lineColor }}
      >
        <div className="z-10 flex items-center justify-center rounded-full bg-black/40 p-1">
          <p className="mx-[0.125rem] rounded-full font-medium text-white">
            {initials}
          </p>
        </div>
      </div>
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
