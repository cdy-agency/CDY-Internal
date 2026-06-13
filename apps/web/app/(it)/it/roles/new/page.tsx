'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { ApiResponse } from '@cdy/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NewItRolePage(): JSX.Element {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    key: '',
    name: '',
    description: '',
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post<ApiResponse<{ id: string }>>('/it/roles', {
        key: form.key.toUpperCase().replace(/\s+/g, '_'),
        name: form.name,
        description: form.description || undefined,
      });
      toast.success('Role created');
      router.push(`/it/roles/${res.data.data.id}`);
    } catch {
      /* interceptor */
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/it/roles" className="text-sm text-cdy-muted hover:text-cdy-white">
          ← Roles
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-cdy-white">Create role</h1>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-4 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6"
      >
        <div>
          <Label htmlFor="key">Role key</Label>
          <Input
            id="key"
            value={form.key}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
              }))
            }
            placeholder="CUSTOM_ROLE"
            required
            className="mt-1 font-mono uppercase"
          />
          <p className="mt-1 text-xs text-cdy-muted">
            Uppercase letters, numbers, and underscores only
          </p>
        </div>

        <div>
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Custom Role"
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <textarea
            id="description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/it/roles">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create role'}
          </Button>
        </div>
      </form>
    </div>
  );
}
