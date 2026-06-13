'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { ApiResponse } from '@cdy/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RoleOption {
  id: string;
  key: string;
  name: string;
}

export default function NewItUserPage(): JSX.Element {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    roleId: '',
    password: '',
  });

  useEffect(() => {
    api
      .get<ApiResponse<RoleOption[]>>('/it/roles')
      .then((res) => setRoles(res.data.data))
      .catch(() => toast.error('Could not load roles'));
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!form.roleId) {
      toast.error('Please select a role');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post<ApiResponse<{ id: string }>>('/it/users', form);
      toast.success('User created');
      router.push(`/it/users/${res.data.data.id}`);
    } catch {
      /* interceptor */
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/it/users" className="text-sm text-cdy-muted hover:text-cdy-white">
          ← Users
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-cdy-white">Create user</h1>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-4 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              required
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="roleId">Role</Label>
          <select
            id="roleId"
            value={form.roleId}
            onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
            required
            className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
          >
            <option value="">Select role…</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="password">Temporary password</Label>
          <Input
            id="password"
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
            className="mt-1"
          />
          <p className="mt-1 text-xs text-cdy-muted">Minimum 8 characters</p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/it/users">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create user'}
          </Button>
        </div>
      </form>
    </div>
  );
}
