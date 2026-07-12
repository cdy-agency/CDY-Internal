'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resolveLandingPath } from '@/lib/module-access';
import type { UserProfile } from '@cdy/shared';

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message ?? 'Invalid email or password');
        return;
      }

      const data = (await response.json()) as { user?: UserProfile };
      const landingPath = resolveLandingPath(
        data.user?.permissions,
        data.user?.homeModule,
      );
      window.location.href = landingPath;
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cdy-navy px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-2 flex items-baseline justify-center gap-1">
            <span className="text-3xl font-bold text-cdy-red">CDY</span>
            <span className="text-3xl font-semibold text-cdy-white">System</span>
          </div>
          <p className="text-sm text-cdy-muted">Internal Operations Platform</p>
        </div>

        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@cdy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="rounded-md border border-[var(--cdy-danger)]/30 bg-[var(--cdy-danger)]/10 px-3 py-2 text-sm text-[var(--cdy-danger)]">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
