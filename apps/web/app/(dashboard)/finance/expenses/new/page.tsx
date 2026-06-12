'use client';

import StubPage from '../../_components/StubPage';
import { PermissionGate } from '@/components/PermissionGate';
import { AccessDenied } from '@/components/AccessDenied';

export default function NewExpensePage(): JSX.Element {
  return (
    <PermissionGate
      feature="finance.expenses"
      action="write"
      fallback={<AccessDenied feature="Log Expense" />}
    >
      <StubPage title="Log Expense" />
    </PermissionGate>
  );
}
