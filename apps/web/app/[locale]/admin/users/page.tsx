'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button, Card, Input } from '@locus/ui';

import { blockUser, getAdminUsers, unblockUser } from '../../../../services/admin.service';

type AdminUser = {
  id: string;
  email: string;
  role: string;
  rating: number;
  createdAt: string;
  isBlocked: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');

  const load = async () => setUsers(await getAdminUsers());

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.toLowerCase();
    return users.filter((u) => u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q));
  }, [users, query]);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Users management</h2>
        <Input placeholder="Search users..." value={query} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} className="max-w-xs" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Email</th>
              <th>Role</th>
              <th>Rating</th>
              <th>Created</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="py-3">{user.email}</td>
                <td>{user.role}</td>
                <td>{user.rating.toFixed(1)}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>{user.isBlocked ? 'Blocked' : 'Active'}</td>
                <td className="text-right">
                  {user.isBlocked ? (
                    <Button variant="secondary" onClick={async () => { await unblockUser(user.id); await load(); }}>
                      Unblock
                    </Button>
                  ) : (
                    <Button onClick={async () => { await blockUser(user.id); await load(); }}>Block</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
