'use client';

import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { usePermissions } from '@/context/PermissionContext';
import {
  currentMonthParam,
} from '@/hooks/useCrm';
import { AgentDashboardView } from '@/components/crm/AgentDashboardView';
import { TeamDashboardView } from '@/components/crm/TeamDashboardView';
import { Button } from '@/components/ui/button';

export default function CrmOverviewPage(): JSX.Element {
  const { roleKey } = usePermissions();
  const isAgent = roleKey === 'SALES_AGENT';
  const [month, setMonth] = useState(currentMonthParam());

  const monthDate = new Date(`${month}-01`);
  const isCurrentMonth = month === currentMonthParam();

  if (isAgent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setMonth(format(subMonths(monthDate, 1), 'yyyy-MM'))
            }
          >
            ←
          </Button>
          <span className="text-sm text-cdy-white">
            {format(monthDate, 'MMMM yyyy')}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={isCurrentMonth}
            onClick={() =>
              setMonth(format(addMonths(monthDate, 1), 'yyyy-MM'))
            }
          >
            →
          </Button>
        </div>
        <AgentDashboardView month={month} />
      </div>
    );
  }

  return <TeamDashboardView month={month} onMonthChange={setMonth} />;
}
