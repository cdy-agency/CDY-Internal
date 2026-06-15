'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { FinanceSidebar } from '@/components/finance/FinanceSidebar';
import { FinanceTopbar } from '@/components/finance/FinanceTopbar';
import type { ApiResponse, UserProfile } from '@cdy/shared';

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    api
      .get<ApiResponse<UserProfile>>('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => router.push('/login'));
  },[user] );

  async function handleLogout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cdy-navy">
      <FinanceSidebar user={user} onLogout={handleLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <FinanceTopbar title="Overview" breadcrumb="Finance" />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
