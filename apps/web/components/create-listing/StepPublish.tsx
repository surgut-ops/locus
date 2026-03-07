'use client';

import type { WizardPhotoItem } from './StepPhotos';

type StepPublishProps = {
  title: string;
  description: string;
  city: string;
  country: string;
  price: number | null;
  currency: string;
  selectedAmenitiesCount: number;
  photos: WizardPhotoItem[];
  isSubmitting: boolean;
  onPublish: () => void;
};

export function StepPublish({
  title,
  description,
  city,
  country,
  price,
  currency,
  selectedAmenitiesCount,
  photos,
  isSubmitting,
  onPublish,
}: StepPublishProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-900">{title || 'Untitled listing'}</h3>
        <p className="mt-1 text-sm text-slate-600">
          {city || 'City'}, {country || 'Country'}
        </p>
        <p className="mt-2 text-sm text-slate-700">{description || 'No description yet.'}</p>
        <p className="mt-3 text-sm font-medium text-slate-900">
          {price ? `${price} ${currency} / night` : 'Price not specified'}
        </p>
        <p className="mt-1 text-sm text-slate-600">Amenities selected: {selectedAmenitiesCount}</p>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
          {photos.slice(0, 8).map((photo) => (
            <div key={photo.localId} className="h-20 overflow-hidden rounded-lg bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.uploadedUrl ?? photo.previewUrl}
                alt={photo.fileName}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Listing will be saved and prepared for publication.
      </div>

      <button
        type="button"
        onClick={onPublish}
        disabled={isSubmitting}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Publishing...' : 'Опубликовать объявление'}
      </button>
    </div>
  );
}
