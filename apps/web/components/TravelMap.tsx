'use client';

import 'leaflet/dist/leaflet.css';
import L, { type DivIcon } from 'leaflet';
import { useMemo } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

import { Link } from '../i18n/navigation';
import type { TravelSearchResponse } from '../services/api';

if (typeof window !== 'undefined') {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

type TravelMapProps = {
  data: TravelSearchResponse;
  className?: string;
};

function priceMarkerIcon(price: number | null): DivIcon {
  const text = `$${price ?? 0}`;
  return L.divIcon({
    className: 'map-price-marker',
    html: `<div style="background:#0f172a;color:#fff;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2)">${text}</div>`,
    iconSize: [1, 1],
    iconAnchor: [18, 14],
  });
}

export function TravelMap({ data, className = '' }: TravelMapProps) {
  const center: [number, number] = useMemo(
    () => [data.latitude, data.longitude],
    [data.latitude, data.longitude],
  );

  const radiusM = useMemo(
    () => data.radiusKm * 1000,
    [data.radiusKm],
  );

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 ${className}`}>
      <MapContainer
        center={center}
        zoom={12}
        className="h-full min-h-[400px] w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={center}
          radius={radiusM}
          pathOptions={{
            color: '#ec4899',
            fillColor: '#ec4899',
            fillOpacity: 0.15,
            weight: 2,
          }}
        />
        <Marker position={center} />
        {data.results.map((item) => (
          <Marker
            key={item.listing.id}
            position={[item.listing.latitude, item.listing.longitude]}
            icon={priceMarkerIcon(item.listing.price)}
          >
            <Popup minWidth={220}>
              <div className="space-y-2">
                <h4 className="line-clamp-2 text-sm font-semibold">{item.listing.title}</h4>
                <p className="text-sm">${item.listing.price ?? 0} / night</p>
                <p className="text-xs text-slate-500">
                  {item.distance.toFixed(1)} km · ~{item.travelTime} min
                </p>
                <Link
                  href={`/listings/${item.listing.id}`}
                  className="text-sm font-medium text-pink-600 underline"
                >
                  View
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-1.5 text-xs text-slate-600 shadow dark:bg-slate-800/95 dark:text-slate-300">
        {data.place} · {data.radiusKm} km radius
      </div>
    </div>
  );
}
