'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { redirectToLoginAfterAuthFailure } from '@/lib/session';
import { ProjectsSidebar } from '@/components/projects/ProjectsSidebar';
import { FinanceTopbar } from '@/components/finance/FinanceTopbar';
import type { ApiResponse, UserProfile } from '@cdy/shared';

export default function ProjectsLayout({
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
      .catch(() => void redirectToLoginAfterAuthFailure(router));
  }, [router]);

  function handleLogout(): void {
    router.push('/login');
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cdy-navy">
      <ProjectsSidebar user={user} onLogout={handleLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <FinanceTopbar title="Projects" breadcrumb="Projects" />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
