'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { getCurrentUser, type AuthUser } from '../../../../services/auth';

export default function DashboardProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCurrentUser();
        setUser(data);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="h-16 w-16 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 h-5 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-sm text-slate-600">Unable to load profile.</p>;
  }

  const fullName = user.name?.trim() || 'User';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="flex items-center gap-4">
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt={fullName} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-700">
            {fullName[0] ?? 'U'}
          </div>
        )}
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{fullName || 'User'}</h2>
          <p className="text-sm text-slate-600">{user.email}</p>
        </div>
      </div>
    </motion.div>
  );
}
