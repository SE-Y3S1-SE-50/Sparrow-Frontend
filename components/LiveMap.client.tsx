"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet"; // ⬅️ removed `{ map }`
import { useEffect, useMemo, useState } from "react";
import supercluster from "supercluster";
import type { DemoParcel } from "@/data/demoParcels";

type BBox = [number, number, number, number];

type FeaturePoint = {
  type: "Feature";
  properties: {
    cluster: boolean;
    parcelId?: string;
    code?: string;
    status?: string;
  };
  geometry: { type: "Point"; coordinates: [number, number] };
};

function InitialFit({ parcels }: { parcels: DemoParcel[] }) {
  const map = useMap();
  useEffect(() => {
    if (!parcels.length) return;
    const first = L.latLng(parcels[0].lat, parcels[0].lng);
    let bounds = L.latLngBounds(first, first);
    for (const p of parcels) bounds = bounds.extend([p.lat, p.lng]);
    map.fitBounds(bounds.pad(0.2));
  }, [map, parcels]);
  return null;
}

function ViewportSync({
  setBounds,
  setZoom,
}: {
  setBounds: (b: BBox) => void;
  setZoom: (z: number) => void;
}) {
  useMapEvents({
    moveend(e) {
      const m = e.target as L.Map;
      const b = m.getBounds();
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      setZoom(m.getZoom());
    },
  });
  return null;
}

/** Renders clusters + parcel markers (has access to Leaflet map via useMap) */
function ClusterMarkers({
  clusters,
  index,
  selectedId,
  onSelect,
}: {
  clusters: any[];
  index: supercluster;
  selectedId: string | null;
  onSelect?: (id: string) => void;
}) {
  const map = useMap();

  return (
    <>
      {clusters.map((feat: any) => {
        const [lng, lat] = feat.geometry.coordinates as [number, number];
        const { cluster: isCluster, point_count: count } = feat.properties;

        if (isCluster) {
          const clusterId = feat.id as number;
          const size = count < 10 ? 30 : count < 50 ? 36 : count < 100 ? 44 : 52;

          const icon = L.divIcon({
            html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:#2b6cb0;color:#fff;font-weight:600;">${count}</div>`,
            className: "cluster-marker",
            iconSize: [size, size],
          });

          return (
            <Marker
              key={`cluster-${clusterId}`} // ✅ key
              position={[lat, lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  const nextZoom = Math.min(
                    index.getClusterExpansionZoom(clusterId),
                    18
                  );
                  map.setView([lat, lng], nextZoom); // ✅ use map from useMap()
                },
              }}
            />
          );
        }

        // Single parcel point
        const pid = String(feat.properties.parcelId);
        const code = feat.properties.code as string;
        const status = feat.properties.status as string;
        const isSelected = pid === selectedId;

        const icon = L.divIcon({
          html: `<div style="
              display:flex;align-items:center;justify-content:center;
              width:${isSelected ? 22 : 18}px;height:${isSelected ? 22 : 18}px;border-radius:50%;
              background:${
                status === "Delivered"
                  ? "#2f855a"
                  : status === "In Transit"
                  ? "#3182ce"
                  : status === "Processing"
                  ? "#805ad5"
                  : status === "Ready"
                  ? "#d69e2e"
                  : "#e53e3e"
              };
              border:${isSelected ? 3 : 2}px solid #111;"></div>`,
          className: "parcel-marker",
          iconSize: [isSelected ? 22 : 18, isSelected ? 22 : 18],
          iconAnchor: [isSelected ? 11 : 9, isSelected ? 11 : 9],
          popupAnchor: [0, -10],
        });

        return (
          <Marker
            key={`parcel-${pid}`} // ✅ key
            position={[lat, lng]}
            icon={icon}
            eventHandlers={{
              click: (e) => {
                onSelect?.(pid);
                (e.target as L.Marker).openPopup();
              },
            }}
          >
            <Popup autoPan keepInView>
              <div style={{ lineHeight: 1.3 }}>
                <div>
                  <b>{code}</b>
                </div>
                <div>Status: {status}</div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export default function LiveMapClient({
  parcels = [],
  selectedId = null,
  onSelect,
}: {
  parcels?: DemoParcel[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const fallbackCenter: [number, number] = [6.9271, 79.8612];

  // GeoJSON points for supercluster
  const points: FeaturePoint[] = useMemo(
    () =>
      parcels.map((p) => ({
        type: "Feature",
        properties: {
          cluster: false,
          parcelId: p.id,
          code: p.code,
          status: p.status,
        },
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      })),
    [parcels]
  );

  const index = useMemo(
    () => new supercluster({ radius: 60, maxZoom: 16 }).load(points as any),
    [points]
  );

  const [bounds, setBounds] = useState<BBox | null>(null);
  const [zoom, setZoom] = useState(4);

  const clusters = useMemo(
    () => (bounds ? index.getClusters(bounds, zoom) : []),
    [bounds, zoom, index]
  );

  return (
    <div style={{ height: "500px", width: "100%" }}>
      <MapContainer
        center={parcels.length ? [parcels[0].lat, parcels[0].lng] : fallbackCenter}
        zoom={parcels.length ? 4 : 11}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Initial fit to all parcels */}
        {parcels.length > 0 && <InitialFit parcels={parcels} />}

        {/* Keep bounds/zoom in sync with map */}
        <ViewportSync setBounds={setBounds} setZoom={setZoom} />

        {/* Cluster + parcel markers */}
        <ClusterMarkers
          clusters={clusters}
          index={index}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </MapContainer>
    </div>
  );
}
