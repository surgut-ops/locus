'use client';

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';

import {
  fetchHeatmapByCity,
  type HeatmapCityResponse,
  type HeatmapDistrictItem,
} from '../services/api';

type CityHeatmapProps = {
  city: string;
  className?: string;
};

const CITY_CENTERS: Record<string, [number, number]> = {
  Dubai: [25.2048, 55.2708],
  Moscow: [55.7558, 37.6173],
  London: [51.5074, -0.1278],
  Paris: [48.8566, 2.3522],
  'New York': [40.7128, -74.006],
  Bangkok: [13.7563, 100.5018],
  Istanbul: [41.0082, 28.9784],
};

const DEFAULT_CENTER: [number, number] = [25.2048, 55.2708];

function heatmapColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#22c55e';
  return '#3b82f6';
}

function HeatmapLayer({
  districts,
  maxScore,
}: {
  districts: HeatmapDistrictItem[];
  maxScore: number;
}) {
  const map = useMap();
  const withCoords = useMemo(
    () => districts.filter((d) => d.latitude != null && d.longitude != null),
    [districts],
  );

  useEffect(() => {
    if (withCoords.length === 0) return;
    const bounds = withCoords
      .map((d) => [d.latitude!, d.longitude!] as [number, number])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, withCoords]);

  return (
    <>
      {withCoords.map((d) => {
        const lat = d.latitude!;
        const lng = d.longitude!;
        const radius = Math.max(12, Math.min(40, (d.heatmapScore / 100) * 35));
        const fillColor = heatmapColor(d.heatmapScore);

        return (
          <CircleMarker
            key={d.district}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              fillColor,
              color: fillColor,
              weight: 2,
              opacity: 0.9,
              fillOpacity: 0.55,
            }}
            eventHandlers={{
              mouseover: () => {
                map.getContainer().style.cursor = 'pointer';
              },
              mouseout: () => {
                map.getContainer().style.cursor = '';
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -radius]} opacity={0.95}>
              <div className="min-w-[140px] space-y-1 p-1">
                <p className="font-semibold text-slate-900">{d.district}</p>
                <p className="text-sm text-slate-700">
                  Avg: ${d.averagePrice.toFixed(0)} / night
                </p>
                <p className="text-sm text-slate-600">
                  Demand: {d.demandScore}/100
                </p>
                <p className="text-xs text-slate-500">
                  {d.listingCount} listings
                </p>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

export function CityHeatmap({ city, className = '' }: CityHeatmapProps) {
  const [data, setData] = useState<HeatmapCityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!city?.trim()) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await fetchHeatmapByCity(city.trim());
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load heatmap');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    void load();
  }, [load]);

  const center = useMemo(
    () =>
      city && CITY_CENTERS[city]
        ? CITY_CENTERS[city]
        : DEFAULT_CENTER,
    [city],
  );

  const maxScore = useMemo(
    () =>
      data?.districts.length
        ? Math.max(...data.districts.map((d) => d.heatmapScore), 1)
        : 1,
    [data],
  );

  if (!city?.trim()) {
    return (
      <div
        className={`flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400 ${className}`}
      >
        Enter a city to view the heatmap
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={`flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 ${className}`}
      >
        Loading heatmap for {city}...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex min-h-[360px] items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 ${className}`}
      >
        {error}
      </div>
    );
  }

  const withCoords =
    data?.districts.filter(
      (d) => d.latitude != null && d.longitude != null,
    ) ?? [];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 ${className}`}
    >
      <MapContainer
        center={center}
        zoom={11}
        className="h-full min-h-[360px] w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {data && data.districts.length > 0 && (
          <HeatmapLayer districts={data.districts} maxScore={maxScore} />
        )}
      </MapContainer>

      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-3 rounded-lg bg-white/95 px-3 py-2 shadow dark:bg-slate-900/95">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {data?.city ?? city} — {data?.districts.length ?? 0} districts
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Low</span>
          <div className="flex h-3 w-24 rounded-full overflow-hidden">
            <div className="h-full w-1/4 bg-blue-500" />
            <div className="h-full w-1/4 bg-green-500" />
            <div className="h-full w-1/4 bg-yellow-500" />
            <div className="h-full w-1/4 bg-orange-500" />
            <div className="h-full w-1/4 bg-red-500" />
          </div>
          <span className="text-xs text-slate-500">High</span>
        </div>
      </div>

      {withCoords.length === 0 && (data?.districts?.length ?? 0) > 0 ? (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-amber-50 px-3 py-1 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          No coordinates for districts. Add lat/lng to listings.
        </div>
      ) : null}
    </div>
  );
}
