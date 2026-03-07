'use client';

import { useState } from 'react';

export type WizardPhotoItem = {
  localId: string;
  previewUrl: string;
  fileName: string;
  uploadedImageId?: string;
  uploadedUrl?: string;
  file?: File;
};

type StepPhotosProps = {
  items: WizardPhotoItem[];
  onFilesAdded: (files: FileList | null) => void;
  onRemove: (localId: string) => void;
  onReorder: (next: WizardPhotoItem[]) => void;
  isUploading: boolean;
};

export function StepPhotos({ items, onFilesAdded, onRemove, onReorder, isUploading }: StepPhotosProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Upload photos</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onFilesAdded(event.target.files)}
          className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white"
        />
      </label>

      {isUploading && (
        <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700">
          Uploading photos...
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-slate-600">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={item.localId}
              draggable
              onDragStart={() => setDraggingId(item.localId)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggingId || draggingId === item.localId) {
                  return;
                }
                const fromIndex = items.findIndex((photo) => photo.localId === draggingId);
                const toIndex = items.findIndex((photo) => photo.localId === item.localId);
                if (fromIndex < 0 || toIndex < 0) {
                  return;
                }
                const next = [...items];
                const [moved] = next.splice(fromIndex, 1);
                next.splice(toIndex, 0, moved);
                onReorder(next);
              }}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <div className="relative h-28 w-full bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.uploadedUrl ?? item.previewUrl} alt={item.fileName} className="h-full w-full object-cover" />
              </div>
              <div className="flex items-center justify-between gap-2 px-2 py-2">
                <span className="line-clamp-1 text-xs text-slate-600">
                  {index + 1}. {item.fileName}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(item.localId)}
                  className="text-xs font-medium text-rose-600"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
