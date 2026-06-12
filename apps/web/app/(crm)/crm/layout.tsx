'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { CrmSidebar } from '@/components/crm/CrmSidebar';
import { FinanceTopbar } from '@/components/finance/FinanceTopbar';
import type { ApiResponse, UserProfile } from '@cdy/shared';

export default function CrmLayout({
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
  }, [router]);

  async function handleLogout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cdy-navy">
      <CrmSidebar user={user} onLogout={handleLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <FinanceTopbar title="Overview" breadcrumb="CRM" />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
