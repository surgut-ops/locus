type MapViewProps = {
  city: string;
};

export function MapView({ city }: MapViewProps) {
  return (
    <div className="h-80 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-700">Map preview for {city || 'selected area'}</p>
      <div className="mt-4 flex h-[280px] items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
        Interactive map integration placeholder
      </div>
    </div>
  );
}
