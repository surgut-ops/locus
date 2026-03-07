'use client';

import { useEffect, useState } from 'react';

import { Card } from '@locus/ui';

import { ReputationBadges } from '../../components/TrustBadges';
import { useHydrateAuth } from '../../hooks/useHydrateAuth';
import { fetchRecommendations } from '../../services/ai.service';
import { getHostBookings, getMyBookings } from '../../services/bookings.service';
import { searchListings } from '../../services/listings.service';
import { getUserReputation } from '../../services/reputation.service';
import { useAppStore } from '../../store/app.store';
import type { Listing } from '../../types';

export default function ProfilePage() {
  useHydrateAuth();
  const auth = useAppStore((state) => state.auth);
  const favorites = useAppStore((state) => state.favorites);

  const [myBookings, setMyBookings] = useState<Array<{ id: string; status: string; listing: { title: string } }>>([]);
  const [hostBookings, setHostBookings] = useState<Array<{ id: string; status: string; listing: { title: string } }>>([]);
  const [hostListings, setHostListings] = useState<Listing[]>([]);
  const [recommended, setRecommended] = useState<Listing[]>([]);
  const [reputation, setReputation] = useState<{
    reputationScore: number;
    badges: string[];
    metrics: { completedBookings: number; completionRate: number; avgResponseTimeMinutes: number | null };
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [bookings, host, recs] = await Promise.all([
          getMyBookings(),
          getHostBookings(),
          fetchRecommendations(),
        ]);
        setMyBookings((bookings as Array<{ id: string; status: string; listing: { title: string } }>) ?? []);
        setHostBookings((host as Array<{ id: string; status: string; listing: { title: string } }>) ?? []);
        setRecommended(recs.slice(0, 6));

        if (auth.userId) {
          const [listings, rep] = await Promise.all([
            searchListings({}),
            getUserReputation(auth.userId),
          ]);
          setHostListings(listings.filter((item) => item.host?.id === auth.userId).slice(0, 6));
          setReputation({
            reputationScore: rep.reputationScore,
            badges: rep.badges,
            metrics: {
              completedBookings: rep.metrics.completedBookings,
              completionRate: rep.metrics.completionRate,
              avgResponseTimeMinutes: rep.metrics.avgResponseTimeMinutes,
            },
          });
        }
      } catch {
        setMyBookings([]);
        setHostBookings([]);
        setReputation(null);
      }
    };
    void load();
  }, [auth.userId]);

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          User: {auth.userId ? auth.userId.slice(0, 8) : 'guest'} | role: {auth.role}
        </p>
        {reputation && (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium">
              Reputation Score: <span className="text-slate-900">{reputation.reputationScore}/100</span>
            </p>
            <ReputationBadges badges={reputation.badges} />
            <p className="text-xs text-slate-500">
              Completed: {reputation.metrics.completedBookings} | Rate: {reputation.metrics.completionRate}%
              {reputation.metrics.avgResponseTimeMinutes != null &&
                ` | Avg response: ${Math.round(reputation.metrics.avgResponseTimeMinutes)}min`}
            </p>
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-lg font-semibold">Booking history</h2>
          <div className="space-y-2 text-sm">
            {myBookings.slice(0, 8).map((booking) => (
              <p key={booking.id}>
                {booking.listing.title} - <span className="font-medium">{booking.status}</span>
              </p>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-lg font-semibold">Host bookings</h2>
          <div className="space-y-2 text-sm">
            {hostBookings.slice(0, 8).map((booking) => (
              <p key={booking.id}>
                {booking.listing.title} - <span className="font-medium">{booking.status}</span>
              </p>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Favorites</h2>
        <p className="text-sm text-slate-700">{favorites.length} saved listings</p>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Host listings</h2>
        <p className="text-sm text-slate-700">{hostListings.length} listings visible in current data</p>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">AI recommendations</h2>
        <ul className="space-y-1 text-sm text-slate-700">
          {recommended.map((listing) => (
            <li key={listing.id}>{listing.title}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
