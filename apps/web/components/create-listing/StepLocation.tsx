'use client';

type LocationState = {
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
};

type StepLocationProps = {
  value: LocationState;
  onChange: (next: LocationState) => void;
};

export function StepLocation({ value, onChange }: StepLocationProps) {
  const mapQuery =
    value.latitude !== null && value.longitude !== null
      ? `${value.latitude},${value.longitude}`
      : `${value.city || 'Location'}, ${value.country || ''}`.trim();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">City</label>
          <input
            value={value.city}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, city: event.target.value })}
            placeholder="Moscow"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Country</label>
          <input
            value={value.country}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, country: event.target.value })}
            placeholder="Russia"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Latitude</label>
          <input
            type="number"
            step="any"
            value={value.latitude ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onChange({
                ...value,
                latitude: event.target.value ? Number(event.target.value) : null,
              })
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Longitude</label>
          <input
            type="number"
            step="any"
            value={value.longitude ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onChange({
                ...value,
                longitude: event.target.value ? Number(event.target.value) : null,
              })
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <iframe
          title="Listing location map"
          src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
          className="h-64 w-full"
          loading="lazy"
        />
      </div>
    </div>
  );
}
