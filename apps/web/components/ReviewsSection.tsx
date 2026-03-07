import { motion } from 'framer-motion';

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  } | null;
};

type ReviewsSectionProps = {
  rating: number;
  reviews: ReviewItem[];
};

export function ReviewsSection({ rating, reviews }: ReviewsSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.12 }}
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-lg font-semibold text-slate-900">Reviews</h2>
      <p className="mt-1 text-sm text-slate-600">
        ★ {rating.toFixed(1)} · {reviews.length} reviews
      </p>

      <div className="mt-4 space-y-3">
        {reviews.length === 0 ? <p className="text-sm text-slate-500">No reviews yet.</p> : null}
        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-800">
                {review.author ? `${review.author.firstName} ${review.author.lastName}` : 'Guest'}
              </span>
              <span className="text-slate-600">★ {review.rating}</span>
            </div>
            <p className="mt-2 text-sm text-slate-700">{review.comment ?? 'No comment'}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
