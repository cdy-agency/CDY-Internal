'use client';

import StubPage from '../../_components/StubPage';
import { PermissionGate } from '@/components/PermissionGate';
import { AccessDenied } from '@/components/AccessDenied';

export default function NewBillPage(): JSX.Element {
  return (
    <PermissionGate
      feature="finance.bills"
      action="write"
      fallback={<AccessDenied feature="Add Bill" />}
    >
      <StubPage title="Add Bill" />
    </PermissionGate>
  );
}
