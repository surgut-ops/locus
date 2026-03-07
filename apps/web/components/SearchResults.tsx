import { ListingCard } from './ListingCard';
import type { ListingSearchItem } from '../services/api';

type SearchResultsProps = {
  items: ListingSearchItem[];
  loading?: boolean;
};

export function SearchResults({ items, loading = false }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-64 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">No listings found.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
