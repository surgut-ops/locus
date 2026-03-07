'use client';

import Image from 'next/image';
import { useState } from 'react';

import { Modal } from '@locus/ui';

type GalleryImage = {
  id: string;
  url: string;
  position: number;
};

type ImageGalleryProps = {
  images: GalleryImage[];
  title: string;
};

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  if (sorted.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        No images yet
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <button className="relative col-span-2 h-64 overflow-hidden rounded-xl md:h-80" onClick={() => setOpen(true)}>
          <Image src={sorted[0].url} alt={title} fill className="object-cover" loading="lazy" />
        </button>
        {sorted.slice(1, 5).map((image, index) => (
          <button key={image.id} className="relative h-40 overflow-hidden rounded-xl" onClick={() => { setActive(index + 1); setOpen(true); }}>
            <Image src={image.url} alt={`${title} ${index + 2}`} fill className="object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <div className="space-y-4">
          <div className="relative h-[380px] overflow-hidden rounded-lg">
            <Image src={sorted[active]?.url ?? sorted[0].url} alt={title} fill className="object-cover" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {sorted.map((image, index) => (
              <button
                key={image.id}
                className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded border ${active === index ? 'border-pink-600' : 'border-slate-300'}`}
                onClick={() => setActive(index)}
              >
                <Image src={image.url} alt={`${title} ${index + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
