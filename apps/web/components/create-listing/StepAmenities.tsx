'use client';

import type { AmenityItem } from '../../services/amenities.service';

type StepAmenitiesProps = {
  amenities: AmenityItem[];
  selectedAmenityIds: string[];
  onToggleAmenity: (amenityId: string) => void;
  isLoading: boolean;
};

export function StepAmenities({
  amenities,
  selectedAmenityIds,
  onToggleAmenity,
  isLoading,
}: StepAmenitiesProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="h-12 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    );
  }

  if (amenities.length === 0) {
    return <p className="text-sm text-slate-600">Amenities are not available yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {amenities.map((amenity) => {
        const checked = selectedAmenityIds.includes(amenity.id);
        return (
          <label
            key={amenity.id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
              checked ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
            }`}
          >
            <input type="checkbox" checked={checked} onChange={() => onToggleAmenity(amenity.id)} />
            <span>{amenity.name}</span>
            <span className="ml-auto text-xs uppercase text-slate-500">{amenity.category}</span>
          </label>
        );
      })}
    </div>
  );
}
