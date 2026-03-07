'use client';

import { useEffect, useState } from 'react';

import { Button, Card } from '@locus/ui';

import { getAdminListings, moderateListing } from '../../../../services/admin.service';

type AdminListing = {
  id: string;
  title: string;
  status: string;
  owner: { email: string };
};

export default function AdminListingsPage() {
  const [listings, setListings] = useState<AdminListing[]>([]);

  const load = async () => setListings(await getAdminListings());

  useEffect(() => {
    void load();
  }, []);

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-lg font-semibold">Listings moderation</h2>
      <div className="space-y-3">
        {listings.map((listing) => (
          <div key={listing.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
            <div>
              <p className="font-medium text-slate-900">{listing.title}</p>
              <p className="text-xs text-slate-600">Owner: {listing.owner.email} | Status: {listing.status}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={async () => { await moderateListing(listing.id, 'approve'); await load(); }}>Approve</Button>
              <Button variant="secondary" onClick={async () => { await moderateListing(listing.id, 'reject'); await load(); }}>
                Reject
              </Button>
              <Button variant="secondary" onClick={async () => { await moderateListing(listing.id, 'block'); await load(); }}>
                Block
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
