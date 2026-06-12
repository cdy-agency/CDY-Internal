'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ProjectMilestonesRedirectPage(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const projectId = String(params.id);

  useEffect(() => {
    router.replace(`/projects/${projectId}?tab=milestones`);
  }, [projectId, router]);

  return <p className="text-sm text-cdy-muted">Redirecting…</p>;
}
