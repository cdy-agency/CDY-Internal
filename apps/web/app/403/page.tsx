import { AccessDenied } from '@/components/AccessDenied';

export default function ForbiddenPage(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cdy-navy">
      <AccessDenied />
    </div>
  );
}
