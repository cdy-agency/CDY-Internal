'use client';

import StubPage from '../../_components/StubPage';
import { PermissionGate } from '@/components/PermissionGate';
import { AccessDenied } from '@/components/AccessDenied';

export default function NewPaymentPage(): JSX.Element {
  return (
    <PermissionGate
      feature="finance.payments"
      action="write"
      fallback={<AccessDenied feature="Record Payment" />}
    >
      <StubPage title="Record Payment" />
    </PermissionGate>
  );
}
