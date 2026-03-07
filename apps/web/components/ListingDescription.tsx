import { motion } from 'framer-motion';

export function ListingDescription({ description }: { description: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-lg font-semibold text-slate-900">Description</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{description}</p>
    </motion.section>
  );
}
