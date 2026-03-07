import { motion } from 'framer-motion';

type ListingMapProps = {
  latitude: number | null;
  longitude: number | null;
  city: string;
};

export function ListingMap({ latitude, longitude, city }: ListingMapProps) {
  const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number';
  const mapEmbedUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${latitude},${longitude}&z=14&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(city)}&z=12&output=embed`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-lg font-semibold text-slate-900">Location</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
        <iframe
          title="listing-map"
          src={mapEmbedUrl}
          className="h-72 w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </motion.section>
  );
}
