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

// Our colors for the map: deep charcoal and neutral grays only, so the only colors on screen
// are the ones that mean something (amber and crimson for flooding, green for the safe route).
// Street names stay light enough to read while driving.
type PaintName = Parameters<MaplibreMap["setPaintProperty"]>[1];

const PAINT: [layer: string, property: PaintName, value: string][] = [
  ["background", "background-color", "#0B0F19"],
  ["water", "fill-color", "#141a26"],
  ["waterway", "line-color", "#1d2431"],
  ["landuse_residential", "fill-color", "#0d121d"],
  ["landuse_park", "fill-color", "#10151f"],
  ["landcover_wood", "fill-color", "#10151f"],
  ["building", "fill-color", "#151b27"],
  ["highway_minor", "line-color", "#1f2633"],
  ["highway_major_casing", "line-color", "#323b4b"],
  ["highway_major_inner", "line-color", "#262e3c"],
  ["highway_major_subtle", "line-color", "#262e3c"],
  ["highway_motorway_casing", "line-color", "#3f4858"],
  ["highway_motorway_inner", "line-color", "#4b5566"],
  ["highway_name_other", "text-color", "#b6bfcc"],
  ["highway_name_other", "text-halo-color", "#0B0F19"],
  ["highway_name_motorway", "text-color", "#cbd2dc"],
  ["water_name", "text-color", "#8792a2"],
  ["place_other", "text-color", "#94a3b8"],
  ["place_suburb", "text-color", "#94a3b8"],
  ["place_village", "text-color", "#94a3b8"],
  ["place_town", "text-color", "#b6bfcc"],
  ["place_city", "text-color", "#b6bfcc"],
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
