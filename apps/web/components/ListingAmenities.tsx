import { motion } from 'framer-motion';

type ListingAmenitiesProps = {
  amenities: Array<{ id: string; name: string; icon?: string | null }>;
};

export function ListingAmenities({ amenities }: ListingAmenitiesProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.08 }}
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-lg font-semibold text-slate-900">Amenities</h2>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {amenities.length === 0 ? <p className="text-sm text-slate-500">No amenities listed.</p> : null}
        {amenities.map((amenity) => (
          <div key={amenity.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="text-base">{amenity.icon ?? '•'}</span>
            <span>{amenity.name}</span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
