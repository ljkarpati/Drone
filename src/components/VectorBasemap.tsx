// The sharp street map. Instead of downloading pictures of streets (which blur on an iPhone's
// high-resolution screen), we download the streets as shapes and let the phone draw them at
// its full resolution, so lines and labels stay crisp at any zoom.
//
// Street data: OpenFreeMap (free, no key), based on OpenStreetMap.
// Drawing library: MapLibre GL, shown inside our Leaflet map with @maplibre/maplibre-gl-leaflet.
//
// The library is big, so it loads in the background. Until it's ready (or if the phone can't
// run it), the map shows ordinary picture tiles instead, so there is never a blank map.

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { Map as MaplibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

// Our colors for the dark style: true black for an OLED screen, a hint of navy to match the
// sky, blue water, and street names bright enough to read while driving.
type PaintName = Parameters<MaplibreMap["setPaintProperty"]>[1];

const PAINT: [layer: string, property: PaintName, value: string][] = [
  ["background", "background-color", "#05080f"],
  ["water", "fill-color", "#0e2440"],
  ["waterway", "line-color", "#1b4472"],
  ["landuse_residential", "fill-color", "#0a0e17"],
  ["landuse_park", "fill-color", "#0b1a14"],
  ["landcover_wood", "fill-color", "#0b1a14"],
  ["building", "fill-color", "#121a28"],
  ["highway_minor", "line-color", "#252d3a"],
  ["highway_major_casing", "line-color", "#3c4656"],
  ["highway_major_inner", "line-color", "#2b3342"],
  ["highway_major_subtle", "line-color", "#2b3342"],
  ["highway_motorway_casing", "line-color", "#4a5466"],
  ["highway_motorway_inner", "line-color", "#5b6678"],
  ["highway_name_other", "text-color", "#c9d1dc"],
  ["highway_name_other", "text-halo-color", "#05080f"],
  ["highway_name_motorway", "text-color", "#e1e6ee"],
  ["water_name", "text-color", "#8db4e2"],
  ["place_other", "text-color", "#b9c2ce"],
  ["place_suburb", "text-color", "#b9c2ce"],
  ["place_village", "text-color", "#b9c2ce"],
  ["place_town", "text-color", "#d0d7e0"],
  ["place_city", "text-color", "#d0d7e0"],
];

function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function VectorBasemap({ onReady }: { onReady: () => void }) {
  const map = useMap();

  useEffect(() => {
    if (!canUseWebGL()) return;
    let cancelled = false;
    let layer: { remove: () => void } | null = null;

    (async () => {
      try {
        const [maplibre, bridge, worker] = await Promise.all([
          import("maplibre-gl"),
          import("@maplibre/maplibre-gl-leaflet"),
          import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
        ]);
        if (cancelled) return;
        maplibre.setWorkerUrl(worker.default);
        const gl = bridge.maplibreGL({
          style: STYLE_URL, // its credits (OpenFreeMap, OpenMapTiles, OpenStreetMap) show automatically
          interactive: false,
        });
        gl.addTo(map);
        layer = gl;
        gl.getMaplibreMap().once("load", (e) => {
          for (const [id, prop, value] of PAINT) {
            try {
              e.target.setPaintProperty(id, prop, value);
            } catch {
              // That layer isn't in this version of the style; skip it.
            }
          }
          if (!cancelled) onReady();
        });
      } catch {
        // Couldn't load the sharp map: the picture tiles stay. Nothing else to do.
      }
    })();

    return () => {
      cancelled = true;
      layer?.remove();
    };
  }, [map, onReady]);

  return null;
}
