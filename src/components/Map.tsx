// The map: streets, the bayou, the danger zones, the gauges and your route.
// Drawn with Leaflet (through react-leaflet); the streets come from VectorBasemap.

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import type { FeatureCollection, Polygon } from "geojson";
import { AttributionControl, GeoJSON, MapContainer, Marker, Pane, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { BRAYS_BAYOU } from "../data/brays-bayou";
import { BRAND, RISK_STYLE } from "../lib/colors";
import { formatAgo } from "../lib/format";
import type { LonLat } from "../lib/geo";
import type { RiskZones, ZoneProperties } from "../lib/risk";
import type { Place } from "../lib/routing";
import type { GaugeStatus } from "../lib/status";
import { gaugeById } from "../data/gauges";
import { Legend } from "./Legend";
import { riskIconSvg } from "./RiskIcon";
import { VectorBasemap } from "./VectorBasemap";

// The middle of Meyerland's boundary in OpenStreetMap (relation 3726371). Brays Bayou runs
// right through it, so the neighborhood on both banks fits on a phone screen at zoom 14.
export const MEYERLAND_CENTER: [number, number] = [29.6788, -95.4761];

type Props = {
  statuses: GaugeStatus[];
  zones: RiskZones;
  route?: LonLat[] | null;
  start?: Place | null;
  end?: Place | null;
};

// Leaflet wants [lat, lon]; GeoJSON (and the rest of our app) uses [lon, lat].
const toLatLng = ([lon, lat]: LonLat): [number, number] => [lat, lon];

export function MapView({ statuses, zones, route, start, end }: Props) {
  const [sharp, setSharp] = useState(false);
  const onSharp = useCallback(() => setSharp(true), []);
  return (
    <div className="map-wrap">
      <MapContainer
        center={MEYERLAND_CENTER}
        zoom={14}
        scrollWheelZoom={false}
        attributionControl={false}
        className="map"
        aria-label="Map of Meyerland showing Brays Bayou, flood risk zones and your route"
      >
        {/* Picture tiles show right away; the sharp vector map replaces them once it loads. */}
        {!sharp && (
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            crossOrigin="anonymous"
            maxZoom={19}
            className="osm-raster"
          />
        )}
        <VectorBasemap onReady={onSharp} />
        <AttributionControl prefix={false} />
        {/* The zones pane is see-through as a whole. Inside it, each zone is drawn solid, so
            overlapping circles blend into one smooth strip instead of a pile of darker rings. */}
        <Pane name="zones" style={{ zIndex: 410, opacity: 0.5 }}>
          <ZoneLayers zones={zones} />
        </Pane>
        <Pane name="bayou" style={{ zIndex: 420 }}>
          <Polyline
            positions={BRAYS_BAYOU.map(toLatLng)}
            pathOptions={{ color: BRAND.bayou, weight: 4, opacity: 0.95 }}
            interactive={false}
          />
        </Pane>
        <Pane name="route" style={{ zIndex: 450 }}>
          {route && route.length > 1 && (
            <>
              <Polyline
                positions={route.map(toLatLng)}
                pathOptions={{ color: BRAND.routeCasing, weight: 12, opacity: 1 }}
                interactive={false}
              />
              <Polyline
                positions={route.map(toLatLng)}
                pathOptions={{ color: BRAND.route, weight: 7, opacity: 1 }}
                interactive={false}
              />
            </>
          )}
        </Pane>
        {statuses.map((s) => (
          <GaugeMarker key={s.gauge.id} status={s} />
        ))}
        {start && <PlaceMarker place={start} text="Start" />}
        {end && <PlaceMarker place={end} text="End" />}
        <FitToRoute route={route} />
      </MapContainer>
      <Legend />
    </div>
  );
}

/** Draws zones in groups (one group per gauge and level), worst level on top. */
function ZoneLayers({ zones }: { zones: RiskZones }) {
  const groups = useMemo(() => {
    const byKey = new Map<string, FeatureCollection<Polygon, ZoneProperties>>();
    for (const f of zones.features) {
      const key = `${f.properties.gaugeId}-${f.properties.level}-${f.properties.lastKnown}`;
      if (!byKey.has(key)) byKey.set(key, { type: "FeatureCollection", features: [] });
      byKey.get(key)!.features.push(f);
    }
    return [...byKey.entries()];
  }, [zones]);

  // All outlines first, then all fills on top: the fills hide every inner edge, so even where
  // two gauges' stretches meet, the strip reads as one shape with one outline around it.
  // (react-leaflet's GeoJSON doesn't redraw when its data changes, so each key includes the
  // feature count; a new key means a fresh layer.)
  // When any zone changes, redraw them all (new key), so the drawing order stays right. If we
  // only added the new ones, they'd be stacked on top of the old fills.
  const signature = groups.map(([key, c]) => `${key}:${c.features.length}`).join("|");
  return (
    <Fragment key={signature}>
      {groups.map(([key, collection]) => {
        const style = RISK_STYLE[collection.features[0].properties.level];
        return (
          <GeoJSON
            key={`outline-${key}-${collection.features.length}`}
            data={collection}
            style={{ color: style.outline, weight: 5, opacity: 1, fill: false }}
            interactive={false}
          />
        );
      })}
      {groups.map(([key, collection]) => {
        const { level, gaugeId, lastKnown } = collection.features[0].properties;
        const style = RISK_STYLE[level];
        const gauge = gaugeById(gaugeId);
        const popup =
          `<strong>${style.label}</strong> along Brays Bayou near ${gauge?.shortName ?? gaugeId}` +
          `${lastKnown ? " (last known reading)" : ""}.<br>${style.meaning}`;
        return (
          <GeoJSON
            key={`fill-${key}-${collection.features.length}`}
            data={collection}
            style={{ stroke: false, fillColor: style.bg, fillOpacity: 1 }}
            onEachFeature={(_, layer) => layer.bindPopup(popup)}
          />
        );
      })}
    </Fragment>
  );
}

function GaugeMarker({ status }: { status: GaugeStatus }) {
  const { gauge, level, reading, ageMin, lastKnown } = status;
  const style = RISK_STYLE[level];
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "gauge-pin-wrap",
        html:
          `<div class="gauge-pin" style="background:${style.bg};color:${style.text};border-color:${style.outline}">` +
          `${riskIconSvg(level, 22)}</div>` +
          `<div class="gauge-pin-label">${gauge.shortName}</div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22],
      }),
    [level, style, gauge.shortName],
  );
  return (
    <Marker
      position={[gauge.lat, gauge.lon]}
      icon={icon}
      title={`${gauge.name}: ${style.label}`}
      alt={`${gauge.name}: ${style.label}`}
    >
      <Popup>
        <strong>{gauge.name}</strong>
        <br />
        {style.label}
        {lastKnown ? " (last known)" : ""}:{" "}
        {reading ? `${reading.stageFt.toFixed(1)} ft, ${formatAgo(ageMin)}` : "no recent reading"}
        <br />
        Flood stage {gauge.stages.flood} ft
      </Popup>
    </Marker>
  );
}

function PlaceMarker({ place, text }: { place: Place; text: string }) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "place-pin-wrap",
        html: `<div class="place-pin">${text}</div>`,
        iconSize: [64, 32],
        iconAnchor: [32, 34],
      }),
    [text],
  );
  return <Marker position={[place.lat, place.lon]} icon={icon} title={`${text}: ${place.label}`} />;
}

/** Zooms the map to show the whole route whenever a new route arrives. */
function FitToRoute({ route }: { route?: LonLat[] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!route || route.length < 2) return;
    map.fitBounds(L.latLngBounds(route.map(toLatLng)), { padding: [36, 36] });
  }, [map, route]);
  return null;
}
