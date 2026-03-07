'use client';

type BasicInfoState = {
  title: string;
  description: string;
  type: 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'ROOM' | 'VILLA' | 'HOTEL';
  rooms: number | null;
  guests: number | null;
};

type StepBasicInfoProps = {
  value: BasicInfoState;
  onChange: (next: BasicInfoState) => void;
};

const TYPE_OPTIONS: Array<{ value: BasicInfoState['type']; label: string }> = [
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'HOUSE', label: 'House' },
  { value: 'STUDIO', label: 'Studio' },
  { value: 'ROOM', label: 'Room' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'HOTEL', label: 'Hotel' },
];

export function StepBasicInfo({ value, onChange }: StepBasicInfoProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
        <input
          value={value.title}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, title: event.target.value })}
          placeholder="Modern apartment in city center"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
        <textarea
          value={value.description}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onChange({ ...value, description: event.target.value })}
          rows={5}
          placeholder="Tell guests what is special about your place"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Property type</label>
          <select
            value={value.type}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...value, type: event.target.value as BasicInfoState['type'] })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Rooms</label>
          <input
            type="number"
            min={1}
            value={value.rooms ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...value, rooms: event.target.value ? Number(event.target.value) : null })
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Guests</label>
          <input
            type="number"
            min={1}
            value={value.guests ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...value, guests: event.target.value ? Number(event.target.value) : null })
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
      </div>
    </div>
  );
}
