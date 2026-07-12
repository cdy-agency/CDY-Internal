'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

interface SystemFeature {
  id: string;
  key: string;
  name: string;
  module: string;
}

interface RolePermission {
  featureId: string;
  canRead: boolean;
  canWrite: boolean;
  feature: SystemFeature;
}

interface RoleDetail {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: RolePermission[];
  _count: { users: number };
}

type PermState = Record<string, { canRead: boolean; canWrite: boolean }>;

function handleToggle(
  prev: PermState,
  featureId: string,
  action: 'canRead' | 'canWrite',
  value: boolean,
): PermState {
  const current = prev[featureId] ?? { canRead: false, canWrite: false };

  if (action === 'canWrite' && value) {
    return { ...prev, [featureId]: { canRead: true, canWrite: true } };
  }

  if (action === 'canRead' && !value) {
    return { ...prev, [featureId]: { canRead: false, canWrite: false } };
  }

  return { ...prev, [featureId]: { ...current, [action]: value } };
}

export default function ItRoleDetailPage(): JSX.Element {
  const params = useParams();
  const roleId = params.id as string;
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [features, setFeatures] = useState<SystemFeature[]>([]);
  const [permissions, setPermissions] = useState<PermState>({});
  const [initial, setInitial] = useState<PermState>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ data: RoleDetail }>(`/it/roles/${roleId}`),
      api.get<{ data: SystemFeature[] }>('/it/features'),
    ]).then(([roleRes, featuresRes]) => {
      const roleData = roleRes.data.data;
      setRole(roleData);
      setFeatures(featuresRes.data.data);

      const state: PermState = {};
      for (const f of featuresRes.data.data) {
        const existing = roleData.permissions.find((p) => p.featureId === f.id);
        state[f.id] = {
          canRead: existing?.canRead ?? false,
          canWrite: existing?.canWrite ?? false,
        };
      }
      setPermissions(state);
      setInitial(state);
    });
  }, [roleId]);

  const modules = useMemo(() => {
    const grouped = new Map<string, SystemFeature[]>();
    for (const f of features) {
      const list = grouped.get(f.module) ?? [];
      list.push(f);
      grouped.set(f.module, list);
    }
    return grouped;
  }, [features]);

  const changedCount = useMemo(
    () =>
      Object.keys(permissions).filter(
        (id) =>
          permissions[id].canRead !== initial[id]?.canRead ||
          permissions[id].canWrite !== initial[id]?.canWrite,
      ).length,
    [permissions, initial],
  );

  async function handleSave(): Promise<void> {
    if (!role || role.key === 'CEO' || role.key === 'IT_ADMINISTRATOR') return;
    const userCount = role._count?.users ?? 0;
    if (
      !confirm(
        `Saving will immediately update permissions for ${userCount} user(s). Continue?`,
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      await api.post(`/it/roles/${roleId}/permissions`, {
        permissions: Object.entries(permissions).map(([featureId, perm]) => ({
          featureId,
          canRead: perm.canRead,
          canWrite: perm.canWrite,
        })),
      });
      setInitial({ ...permissions });
    } finally {
      setSaving(false);
    }
  }

  if (!role) {
    return <p className="text-cdy-muted">Loading role...</p>;
  }

  const isProtected = role.key === 'CEO' || role.key === 'IT_ADMINISTRATOR';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-cdy-white">{role.name}</h1>
        {role.description && (
          <p className="mt-1 text-sm text-cdy-muted">{role.description}</p>
        )}
        {isProtected && (
          <p className="mt-2 text-sm text-amber-400">
            {role.key === 'CEO'
              ? 'The CEO role is granted every feature by the system seed and cannot be modified here.'
              : 'IT Administrator permissions cannot be modified through the dashboard.'}
          </p>
        )}
      </div>

      {Array.from(modules.entries()).map(([module, moduleFeatures]) => (
        <div
          key={module}
          className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4"
        >
          <h2 className="mb-3 text-xs font-semibold uppercase text-cdy-muted">
            {module} module
          </h2>
          <div className="space-y-2">
            {moduleFeatures.map((feature) => {
              const perm = permissions[feature.id] ?? {
                canRead: false,
                canWrite: false,
              };
              const changed =
                perm.canRead !== initial[feature.id]?.canRead ||
                perm.canWrite !== initial[feature.id]?.canWrite;

              return (
                <div
                  key={feature.id}
                  className={`flex items-center justify-between rounded px-2 py-2 text-sm ${
                    changed ? 'bg-amber-500/10' : ''
                  }`}
                >
                  <span className="text-cdy-white">{feature.name}</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-cdy-muted">
                      READ
                      <input
                        type="checkbox"
                        checked={perm.canRead}
                        disabled={isProtected}
                        onChange={(e) =>
                          setPermissions((prev) =>
                            handleToggle(prev, feature.id, 'canRead', e.target.checked),
                          )
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2 text-cdy-muted">
                      WRITE
                      <input
                        type="checkbox"
                        checked={perm.canWrite}
                        disabled={isProtected}
                        onChange={(e) =>
                          setPermissions((prev) =>
                            handleToggle(prev, feature.id, 'canWrite', e.target.checked),
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!isProtected && (
        <Button onClick={handleSave} disabled={saving || changedCount === 0}>
          {saving ? 'Saving...' : `Save Changes (${changedCount} modified)`}
        </Button>
      )}
    </div>
  );
}
