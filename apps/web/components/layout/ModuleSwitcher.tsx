'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, Coins, UserCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/context/PermissionContext';

const MODULES = [
  {
    label: 'Finance',
    href: '/finance',
    feature: 'finance.dashboard',
    icon: Coins,
  },
  {
    label: 'CRM',
    href: '/crm',
    feature: 'crm.pipeline',
    icon: Users,
  },
  {
    label: 'HR',
    href: '/hr',
    feature: 'hr.employees',
    icon: UserCircle,
  },
  {
    label: 'Projects',
    href: '/projects',
    feature: 'projects.all',
    altFeature: 'projects.own',
    icon: Briefcase,
  },
] as const;

export function ModuleSwitcher(): JSX.Element | null {
  const pathname = usePathname();
  const { canRead, roleKey } = usePermissions();

  if (roleKey === 'IT') {
    return null;
  }

  const visible = MODULES.filter(
    (m) =>
      canRead(m.feature) ||
      ('altFeature' in m && m.altFeature && canRead(m.altFeature)),
  );
  if (visible.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-1">
      {visible.map((module) => {
        const active = pathname.startsWith(module.href);
        const Icon = module.icon;
        return (
          <Link
            key={module.href}
            href={module.href}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-cdy-red text-white'
                : 'text-cdy-muted hover:text-cdy-white',
            )}
          >
            <Icon className="h-4 w-4" />
            {module.label}
          </Link>
        );
      })}
    </div>
  );
}
