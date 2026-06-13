'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import type { ApiResponse } from '@cdy/shared';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';

interface RoleRow {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
}

export default function ItRolesPage(): JSX.Element {
  const [roles, setRoles] = useState<RoleRow[]>([]);

  useEffect(() => {
    api
      .get<ApiResponse<RoleRow[]>>('/it/roles')
      .then((res) => setRoles(res.data.data))
      .catch(() => setRoles([]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-cdy-white">Roles</h1>
        <PermissionGate feature="it.roles" action="write">
          <Button asChild>
            <Link href="/it/roles/new">+ Create role</Link>
          </Button>
        </PermissionGate>
      </div>
      <div className="overflow-hidden rounded-lg border border-cdy-navy-border">
        <table className="w-full text-sm">
          <thead className="bg-cdy-navy-light text-left text-cdy-muted">
            <tr>
              <th className="p-3">Role</th>
              <th className="p-3">Users</th>
              <th className="p-3">Features</th>
              <th className="p-3">System</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr
                key={role.id}
                className="border-t border-cdy-navy-border hover:bg-cdy-navy-light/50"
              >
                <td className="p-3">
                  <Link href={`/it/roles/${role.id}`} className="text-cdy-white hover:underline">
                    {role.name}
                  </Link>
                </td>
                <td className="p-3 text-cdy-muted">{role.userCount}</td>
                <td className="p-3 text-cdy-muted">{role.permissionCount}</td>
                <td className="p-3">
                  {role.isSystem ? (
                    <span className="text-xs text-amber-400">🔒 System</span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
