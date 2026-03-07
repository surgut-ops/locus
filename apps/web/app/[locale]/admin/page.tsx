'use client';

import { useEffect, useState } from 'react';

import { Card } from '@locus/ui';

import { getAdminAnalytics, getAdminAudit } from '../../../services/admin.service';

export default function AdminPage() {
  const [analytics, setAnalytics] = useState<{
    usersCount: number;
    listingsCount: number;
    bookingsCount: number;
    activeListings: number;
    estimatedRevenue: string;
  } | null>(null);
  const [recentActivity, setRecentActivity] = useState<
    Array<{ id: string; action: string; targetId: string; createdAt: string }>
  >([]);

  useEffect(() => {
    const load = async () => {
      const [stats, activity] = await Promise.all([getAdminAnalytics(), getAdminAudit()]);
      setAnalytics(stats);
      setRecentActivity(activity.slice(0, 8));
    };
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total users" value={analytics?.usersCount ?? '-'} />
        <MetricCard label="Active listings" value={analytics?.activeListings ?? '-'} />
        <MetricCard label="Total bookings" value={analytics?.bookingsCount ?? '-'} />
        <MetricCard label="Est. revenue" value={analytics?.estimatedRevenue ?? '-'} />
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Recent activity</h2>
        <div className="space-y-2 text-sm">
          {recentActivity.map((item) => (
            <p key={item.id}>
              {item.action} - {item.targetId.slice(0, 8)} - {new Date(item.createdAt).toLocaleString()}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </Card>
  );
}
