'use client';

import { useEffect, useState } from 'react';

import { Card } from '@locus/ui';

import { HostAIInsights } from '../../../components/host/HostAIInsights';
import { HostCharts } from '../../../components/host/HostCharts';
import { HostMetricsCards } from '../../../components/host/HostMetricsCards';
import { HostPricePerformance } from '../../../components/host/HostPricePerformance';
import { useHydrateAuth } from '../../../hooks/useHydrateAuth';
import { fetchHostDashboard, type HostDashboardData } from '../../../services/api';
import { useAppStore } from '../../../store/app.store';

export default function HostDashboardPage() {
  useHydrateAuth();
  const auth = useAppStore((state) => state.auth);
  const [data, setData] = useState<HostDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAllowed =
    auth.role === 'HOST' || auth.role === 'ADMIN' || auth.role === 'MODERATOR';

  useEffect(() => {
    if (!isAllowed) {
      setLoading(false);
      return;
    }
    fetchHostDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [isAllowed]);

  if (!isAllowed) {
    return (
      <Card className="p-6">
        <h1 className="text-xl font-semibold">Host Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Host role required to access analytics.
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Host Dashboard</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700"
            />
          ))}
        </div>
        <p className="text-slate-500">Loading analytics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <h1 className="text-xl font-semibold">Host Dashboard</h1>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const totalBookings = data.bookingsPerMonth.reduce((s, b) => s + b.count, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Host Dashboard</h1>

      <HostMetricsCards
        totalRevenue={data.totalRevenue}
        occupancyRate={data.occupancyRate}
        listingCount={data.listingCount}
        bookingsCount={totalBookings}
      />

      <HostCharts
        monthlyRevenue={data.monthlyRevenue}
        bookingsPerMonth={data.bookingsPerMonth}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HostPricePerformance items={data.pricePerformance} />
        </div>
        <div>
          <HostAIInsights aiInsight={data.aiInsight} />
        </div>
      </div>
    </div>
  );
}
