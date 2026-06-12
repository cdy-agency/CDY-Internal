'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { ApiResponse, PermissionMap } from '@cdy/shared';

interface ItUserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  role: { id: string; key: string; name: string; description: string | null };
  permissions: PermissionMap;
}

interface RoleOption {
  id: string;
  key: string;
  name: string;
}

export default function ItUserDetailPage(): JSX.Element {
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<ItUserDetail | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<ItUserDetail>>(`/it/users/${userId}`),
      api.get<ApiResponse<RoleOption[]>>('/it/roles'),
    ])
      .then(([userRes, rolesRes]) => {
        setUser(userRes.data.data);
        setSelectedRoleId(userRes.data.data.role.id);
        setRoles(rolesRes.data.data);
      })
      .catch(() => setUser(null));
  }, [userId]);

  async function handleRoleChange(): Promise<void> {
    if (!selectedRoleId) return;
    await api.patch(`/it/users/${userId}/role`, { roleId: selectedRoleId });
    const res = await api.get<ApiResponse<ItUserDetail>>(`/it/users/${userId}`);
    setUser(res.data.data);
  }

  async function handleDeactivate(): Promise<void> {
    if (!confirm('Deactivate this user?')) return;
    await api.delete(`/it/users/${userId}`);
    const res = await api.get<ApiResponse<ItUserDetail>>(`/it/users/${userId}`);
    setUser(res.data.data);
  }

  if (!user) {
    return <p className="text-cdy-muted">Loading user...</p>;
  }

  const modules = ['finance', 'crm', 'hr', 'projects', 'it'] as const;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-cdy-white">
        {user.firstName} {user.lastName}
      </h1>

      <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
        <p className="text-cdy-muted">{user.email}</p>
        <p className="mt-2 text-sm text-cdy-muted">
          Created {new Date(user.createdAt).toLocaleDateString()} ·{' '}
          {user.isActive ? 'Active' : 'Inactive'}
        </p>
      </div>

      <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
        <h2 className="mb-2 font-medium text-cdy-white">Current role</h2>
        <p className="text-cdy-white">{user.role.name}</p>
        {user.role.description && (
          <p className="mt-1 text-sm text-cdy-muted">{user.role.description}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="rounded border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <Button onClick={handleRoleChange}>Change Role</Button>
          {user.isActive && (
            <Button variant="outline" onClick={handleDeactivate}>
              Deactivate
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
        <h2 className="mb-4 font-medium text-cdy-white">Permission summary</h2>
        {modules.map((module) => {
          const entries = Object.entries(user.permissions).filter(([key]) =>
            key.startsWith(`${module}.`),
          );
          if (!entries.length) return null;
          return (
            <div key={module} className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase text-cdy-muted">
                {module}
              </h3>
              <div className="space-y-1 text-sm">
                {entries.map(([key, perm]) => (
                  <div key={key} className="flex justify-between text-cdy-white">
                    <span>{key}</span>
                    <span className="text-cdy-muted">
                      READ {perm.canRead ? '✅' : '❌'} · WRITE{' '}
                      {perm.canWrite ? '✅' : '❌'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
