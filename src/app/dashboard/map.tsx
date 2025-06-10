"use client";

import { FireFighterCircle } from "@/src/components/ff-circle";
import { DEMO_INITIAL_CENTER } from "@/src/env";
import { RouteIcon, SatelliteIcon } from "lucide-react";
import mapboxgl, { LngLatLike, MapOptions } from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { useFireground } from "../providers/fireground";

const mapboxConfig = (ref: any) =>
  ({
    container: ref,
    style: "mapbox://styles/mapbox/dark-v11",
    center: DEMO_INITIAL_CENTER,
    zoom: 18,
    attributionControl: false,
  }) as MapOptions;

export function Map({}: {}) {
  const { teams, mapCenter, getAllSensorUpdates } = useFireground();

  const mapData = teams
    .flatMap((team) => team.crew)
    .map((member) => {
      return {
        ...member,
        route: `route_${member.id}`,
        layer: `layer_${member.id}`,
      };
    });

  const mapContainer = useRef<any>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker | null>>({});
  const coordinatesRef = useRef<Record<string, number[][]>>({});

  const [mapView, setMapView] = useState<"dark-v11" | "satellite-v9">(
    "dark-v11",
  );
  const [trailsVisible, setTrailsVisible] = useState(true);

  const toggleMapView = () => {
    const newStyle = mapView === "dark-v11" ? "satellite-v9" : "dark-v11";
    setMapView(newStyle);
    if (mapRef.current) {
      mapRef.current.setStyle(`mapbox://styles/mapbox/${newStyle}`);
      mapRef.current.on("style.load", () => {
        // Re-add sources and layers after style change
        mapData.forEach((member) => {
          initializePath({
            routeId: member.route,
            layerId: member.layer,
            color: member.color,
            coordinates: coordinatesRef.current[member.id] ?? [],
          });
        });
        // Reapply trails visibility
        applyTrailsVisibility(trailsVisible);
      });
    }
  };

  const toggleTrails = () => {
    setTrailsVisible((prev) => {
      const newVisibility = !prev;
      applyTrailsVisibility(newVisibility);
      return newVisibility;
    });
  };

  const applyTrailsVisibility = (visible: boolean) => {
    const layers = mapData.map((member) => member.layer);
    layers.forEach((layerId) => {
      const layer = mapRef.current?.getLayer(layerId);
      if (layer) {
        mapRef.current?.setLayoutProperty(
          layerId,
          "visibility",
          visible ? "visible" : "none",
        );
      }
    });
  };

  function initializePath({
    routeId,
    layerId,
    color,
    coordinates,
  }: {
    routeId: string;
    layerId: string;
    color: string;
    coordinates: number[][];
  }) {
    if (!mapRef.current) {
      return;
    }

    const map = mapRef.current;
    const source = map.getSource(routeId);
    if (source) {
      (source as mapboxgl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates,
        },
      });
    } else {
      map.addSource(routeId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates,
          },
        },
      });
      map.addLayer({
        id: layerId,
        type: "line",
        source: routeId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": color,
          "line-width": 2,
          "line-dasharray": [3, 2], // [dash length, gap length]
        },
      });
    }
  }

  function updateMarker({
    id,
    initials,
    color,
    lngLat,
    markers,
  }: {
    id: number;
    initials: string;
    color: string;
    lngLat: LngLatLike;
    markers: Record<string, mapboxgl.Marker | null>;
  }) {
    if (!mapRef.current) {
      return;
    }

    const map = mapRef.current;
    const sourceId = `route_${id}`;
    const source = map.getSource(sourceId);
    if (source) {
      (source as mapboxgl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coordinatesRef.current[id],
        },
      });
    }

    if (Array.isArray(lngLat) && lngLat.some(isNaN)) {
      return;
    }
    if (markers[id]) {
      markers[id].remove();
    }
    const markerElement1 = (
      <FireFighterCircle color={color} initials={initials} />
    );
    const staticElement = renderToStaticMarkup(markerElement1);
    const markerElement = document.createElement("div");
    markerElement.innerHTML = staticElement;

    const mapboxMarker = new mapboxgl.Marker(markerElement)
      .setLngLat(lngLat)
      .addTo(mapRef.current);
    markers[id] = mapboxMarker;
  }

  // on startup -> initialize
  useEffect(() => {
    if (mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
    mapRef.current = new mapboxgl.Map(mapboxConfig(mapContainer.current));

    mapRef.current.on("load", () => {
      mapData.forEach((member) => {
        initializePath({
          routeId: member.route,
          layerId: member.layer,
          color: member.color,
          coordinates: coordinatesRef.current[member.id] ?? [],
        });
      });
      applyTrailsVisibility(trailsVisible);
    });
  }, [mapData]);

  // when new data comes in
  useEffect(() => {
    const allUpdates = getAllSensorUpdates();

    // Process each firefighter's sensor data
    allUpdates.forEach((sensorDataWithCrew, firefighterId) => {
      const { sensorData, crewMember } = sensorDataWithCrew;
      const coordinates: LngLatLike = [
        sensorData.Longitude,
        sensorData.Latitude,
      ];

      // 👣 render path
      if (!coordinatesRef.current[crewMember.id]) {
        coordinatesRef.current[crewMember.id] = [];
      }
      coordinatesRef.current[crewMember.id].push(coordinates as number[]);

      // Update the path on the map
      initializePath({
        routeId: `route_${crewMember.id}`,
        layerId: `layer_${crewMember.id}`,
        coordinates: coordinatesRef.current[crewMember.id],
        color: crewMember.color,
      });

      // 📍 render marker
      updateMarker({
        id: crewMember.id,
        initials: crewMember.initials,
        color: crewMember.color,
        lngLat: coordinates,
        markers: markersRef.current,
      });
    });

    // 🎨 repaint paths for all members
    mapData.forEach((member) => {
      const layer = mapRef.current?.getLayer(member.layer);
      if (layer) {
        mapRef.current?.setPaintProperty(
          member.layer,
          "line-color",
          member.color,
        );
      }
    });
  }, [teams, getAllSensorUpdates]);

  // when upstream handlers are called
  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.flyTo({ center: mapCenter, essential: true });
  }, [mapCenter]);

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
