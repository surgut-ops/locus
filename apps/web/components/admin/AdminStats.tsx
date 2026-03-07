'use client';

import type { AdminStats as AdminStatsType } from '../../services/admin.service';

type AdminStatsProps = {
  stats: AdminStatsType | null;
  loading?: boolean;
};

export function AdminStats({ stats, loading }: AdminStatsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers ?? '-', color: 'text-slate-900' },
    { label: 'Total Listings', value: stats?.totalListings ?? '-', color: 'text-slate-900' },
    { label: 'Total Bookings', value: stats?.totalBookings ?? '-', color: 'text-slate-900' },
    {
      label: 'Revenue',
      value: stats?.totalRevenue ? formatRevenue(stats.totalRevenue) : '-',
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
          <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function formatRevenue(value: string): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(2);
}
