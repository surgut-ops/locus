'use client';

import 'leaflet/dist/leaflet.css';
import L, { type DivIcon, type LatLngBounds } from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';

import { Link } from '../i18n/navigation';
import { fetchMapListings, type MapListingItem } from '../services/api';

type MapSearchProps = {
  className?: string;
};

type BoundsPayload = {
  north: number;
  south: number;
  east: number;
  west: number;
};

const DEFAULT_CENTER: [number, number] = [25.2048, 55.2708];

if (typeof window !== 'undefined') {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

export function MapSearch({ className = '' }: MapSearchProps) {
  const [listings, setListings] = useState<MapListingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastBoundsKeyRef = useRef<string>('');

  const loadByBounds = useCallback(async (bounds: BoundsPayload) => {
    const nextKey = boundsKey(bounds);
    if (lastBoundsKeyRef.current === nextKey) {
      return;
    }
    lastBoundsKeyRef.current = nextKey;

    setLoading(true);
    setError('');
    try {
      const items = await fetchMapListings(bounds);
      setListings(items);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Failed to load map listings';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className={`relative h-full min-h-[360px] overflow-hidden rounded-2xl border border-slate-200 ${className}`}>
      <MapContainer center={DEFAULT_CENTER} zoom={11} className="h-full min-h-[360px] w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <BoundsWatcher onBoundsChange={loadByBounds} />

        {listings.map((listing) => (
          <Marker
            key={listing.id}
            position={[listing.latitude, listing.longitude]}
            icon={priceMarkerIcon(listing.price)}
          >
            <Popup minWidth={200}>
              <div className="space-y-2">
                {listing.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.image}
                    alt={listing.title}
                    className="h-24 w-full rounded-md object-cover"
                  />
                ) : null}
                <h4 className="line-clamp-2 text-sm font-semibold text-slate-900">{listing.title}</h4>
                <p className="text-sm text-slate-700">${listing.price ?? 0}</p>
                <Link href={`/listings/${listing.id}`} className="text-sm font-medium text-slate-900 underline">
                  Open listing
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {loading ? (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/95 px-3 py-1 text-xs text-slate-700 shadow">
          Updating markers...
        </div>
      ) : null}
      {error ? (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-red-50 px-3 py-1 text-xs text-red-700 shadow">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function BoundsWatcher({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: BoundsPayload) => void | Promise<void>;
}) {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(toPayload(map.getBounds()));
    },
    zoomend: () => {
      onBoundsChange(toPayload(map.getBounds()));
    },
  });

  useEffect(() => {
    onBoundsChange(toPayload(map.getBounds()));
  }, [map, onBoundsChange]);

  return null;
}

function toPayload(bounds: LatLngBounds): BoundsPayload {
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  };
}

function boundsKey(bounds: BoundsPayload): string {
  return [
    bounds.north.toFixed(4),
    bounds.south.toFixed(4),
    bounds.east.toFixed(4),
    bounds.west.toFixed(4),
  ].join(':');
}

function priceMarkerIcon(price: number | null): DivIcon {
  const text = `$${price ?? 0}`;
  return L.divIcon({
    className: 'map-price-marker',
    html: `<div style="background:#0f172a;color:#fff;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2)">${text}</div>`,
    iconSize: [1, 1],
    iconAnchor: [18, 14],
  });
}
