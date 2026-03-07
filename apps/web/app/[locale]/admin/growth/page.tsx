'use client';

import { useEffect, useState } from 'react';

import { Card } from '@locus/ui';

import { getAdminGrowthMetrics } from '../../../../services/growth.service';

type GrowthMetrics = {
  dailyUsers: number;
  newListings: number;
  conversionRate: number;
  revenueGrowth: number;
  funnel: {
    visitHomepageToSearch: number;
    searchToViewListing: number;
    viewListingToBooking: number;
    bookingToPayment: number;
    overallVisitToPayment: number;
  };
};

export default function AdminGrowthPage() {
  const [metrics, setMetrics] = useState<GrowthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAdminGrowthMetrics();
        setMetrics(data);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (!metrics) {
    return <Card className="p-4 text-sm text-slate-700">Growth metrics unavailable.</Card>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500">Daily users</p>
          <p className="mt-1 text-2xl font-semibold">{metrics.dailyUsers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">New listings</p>
          <p className="mt-1 text-2xl font-semibold">{metrics.newListings}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Conversion rate</p>
          <p className="mt-1 text-2xl font-semibold">{metrics.conversionRate}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Revenue growth</p>
          <p className="mt-1 text-2xl font-semibold">{metrics.revenueGrowth}%</p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-2 text-lg font-semibold">Funnel conversion</h2>
        <div className="space-y-1 text-sm text-slate-700">
          <p>Homepage -&gt; Search: {metrics.funnel.visitHomepageToSearch}%</p>
          <p>Search -&gt; Listing view: {metrics.funnel.searchToViewListing}%</p>
          <p>Listing view -&gt; Booking: {metrics.funnel.viewListingToBooking}%</p>
          <p>Booking -&gt; Payment: {metrics.funnel.bookingToPayment}%</p>
          <p>Overall (Visit -&gt; Payment): {metrics.funnel.overallVisitToPayment}%</p>
        </div>
      </Card>
    </div>
  );
}
