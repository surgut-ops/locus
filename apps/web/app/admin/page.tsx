'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useEffect, useState } from 'react';

import Link from 'next/link';

import {
  getAdminStats,
  getAdminUsers,
  getAdminListings,
  getAdminBookings,
  type AdminStats as AdminStatsType,
} from '../../services/admin.service';
import { AdminStats } from '../../components/admin/AdminStats';

const CHART_COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981'];

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStatsType | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; email: string; role: string; createdAt: string }>>([]);
  const [listings, setListings] = useState<
    Array<{ id: string; title: string; status: string; owner: { email: string } }>
  >([]);
  const [bookings, setBookings] = useState<
    Array<{
      id: string;
      listing: { title: string };
      guest: { email: string };
      totalPrice: string;
      status: string;
      currency: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, usersData, listingsData, bookingsData] = await Promise.all([
          getAdminStats(),
          getAdminUsers(),
          getAdminListings(),
          getAdminBookings(),
        ]);
        setStats(statsData);
        setUsers(usersData);
        setListings(listingsData);
        setBookings(bookingsData);
      } catch {
        setStats(null);
        setUsers([]);
        setListings([]);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const roleData = users.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const pieData = Object.entries(roleData).map(([name, value]) => ({ name, value }));

  const statusData = bookings.reduce(
    (acc, b) => {
      acc[b.status] = (acc[b.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const barData = Object.entries(statusData).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6">
      <AdminStats stats={stats} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Users by Role</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">No data</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Bookings by Status</h2>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">No data</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Users</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">
                  <Link href="/admin/users" className="text-pink-600 hover:text-pink-700">
                    View all →
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 5).map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Listings</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">
                  <Link href="/admin/listings" className="text-pink-600 hover:text-pink-700">
                    View all →
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {listings.slice(0, 5).map((listing) => (
                <tr key={listing.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{listing.title}</td>
                  <td className="px-4 py-3">{listing.owner?.email ?? '-'}</td>
                  <td className="px-4 py-3">{listing.status}</td>
                  <td className="px-4 py-3">{null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Bookings</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">
                  <Link href="/admin/bookings" className="text-pink-600 hover:text-pink-700">
                    View all →
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 5).map((booking) => (
                <tr key={booking.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{booking.listing.title}</td>
                  <td className="px-4 py-3">{booking.guest.email}</td>
                  <td className="px-4 py-3">
                    {booking.currency} {booking.totalPrice}
                  </td>
                  <td className="px-4 py-3">{booking.status}</td>
                  <td className="px-4 py-3">{null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
