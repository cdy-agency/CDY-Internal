'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import type { ApiResponse } from '@cdy/shared';

interface ItUserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  role: { id: string; key: string; name: string };
}

export default function ItUsersPage(): JSX.Element {
  const [users, setUsers] = useState<ItUserRow[]>([]);

  useEffect(() => {
    api
      .get<ApiResponse<ItUserRow[]>>('/it/users')
      .then((res) => setUsers(res.data.data))
      .catch(() => setUsers([]));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-cdy-white">Users</h1>
      <div className="overflow-hidden rounded-lg border border-cdy-navy-border">
        <table className="w-full text-sm">
          <thead className="bg-cdy-navy-light text-left text-cdy-muted">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-t border-cdy-navy-border hover:bg-cdy-navy-light/50"
              >
                <td className="p-3">
                  <Link href={`/it/users/${user.id}`} className="text-cdy-white hover:underline">
                    {user.firstName} {user.lastName}
                  </Link>
                </td>
                <td className="p-3 text-cdy-muted">{user.email}</td>
                <td className="p-3">
                  <span className="rounded-full border border-cdy-navy-border px-2 py-0.5 text-xs">
                    {user.role.name}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={
                      user.isActive ? 'text-emerald-400' : 'text-red-400'
                    }
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
