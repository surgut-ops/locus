'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

type ListingGalleryProps = {
  title: string;
  images: Array<{ id: string; url: string; thumbnailUrl?: string | null }>;
};

const FALLBACK_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%22800%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23e2e8f0%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%2364758b%22 font-family=%22Arial%22 font-size=%2236%22%3ENo%20Image%3C/text%3E%3C/svg%3E';

export function ListingGallery({ title, images }: ListingGalleryProps) {
  const normalized = useMemo(
    () =>
      images.length > 0
        ? images
        : [
            {
              id: 'fallback',
              url: FALLBACK_IMAGE,
              thumbnailUrl: FALLBACK_IMAGE,
            },
          ],
    [images],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const activeImage = normalized[activeIndex] ?? normalized[0];

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="space-y-3"
      >
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="group relative block h-[260px] w-full overflow-hidden rounded-2xl md:h-[420px]"
        >
          <Image
            src={activeImage.thumbnailUrl ?? activeImage.url}
            alt={title}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            unoptimized
            priority
          />
        </button>

        <div className="grid grid-cols-5 gap-2 md:grid-cols-8">
          {normalized.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative h-14 overflow-hidden rounded-lg md:h-16 ${
                index === activeIndex ? 'ring-2 ring-slate-900' : 'ring-1 ring-slate-200'
              }`}
            >
              <Image src={image.thumbnailUrl ?? image.url} alt={`${title} ${index + 1}`} fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      </motion.section>

      {fullscreen ? (
        <div className="fixed inset-0 z-[70] bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="mb-3 rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
          >
            Close
          </button>
          <div className="relative h-[80vh] w-full overflow-hidden rounded-2xl">
            <Image src={activeImage.url} alt={title} fill className="object-contain" unoptimized />
          </div>
        </div>
      ) : null}
    </>
  );
}
