'use client';

import { Button, Input } from './ui';

type SearchFiltersProps = {
  values: {
    city: string;
    priceMin: string;
    priceMax: string;
    rooms: string;
    guests: string;
    amenities: string;
    rating: string;
  };
  onChange: (next: SearchFiltersProps['values']) => void;
  onSubmit: () => void;
  onReset?: () => void;
};

export function SearchFilters({ values, onChange, onSubmit, onReset }: SearchFiltersProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">Search filters</h3>

      <Input
        placeholder="City"
        value={values.city}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...values, city: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Min price"
          type="number"
          value={values.priceMin}
          onChange={(e) => onChange({ ...values, priceMin: e.target.value })}
        />
        <Input
          placeholder="Max price"
          type="number"
          value={values.priceMax}
          onChange={(e) => onChange({ ...values, priceMax: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Rooms"
          type="number"
          value={values.rooms}
          onChange={(e) => onChange({ ...values, rooms: e.target.value })}
        />
        <Input
          placeholder="Guests"
          type="number"
          value={values.guests}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...values, guests: e.target.value })}
        />
      </div>
      <Input
        placeholder="Amenities (wifi,pool,parking)"
        value={values.amenities}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...values, amenities: e.target.value })}
      />
      <Input
        placeholder="Min rating (1-5)"
        type="number"
        min={1}
        max={5}
        value={values.rating}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...values, rating: e.target.value })}
      />
      <div className="flex gap-2">
        <Button onClick={onSubmit} className="flex-1">
          Apply
        </Button>
        {onReset ? (
          <Button onClick={onReset} variant="secondary" className="flex-1">
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}
