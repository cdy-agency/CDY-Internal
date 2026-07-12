'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, Coins, Code2, LayoutDashboard, Megaphone, Palette, Star, TrendingUp, UserCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/context/PermissionContext';
import { MODULE_HOME_ROUTES, isRouteAllowed } from '@/lib/module-access';

const MODULES = [
  { label: 'CEO', href: '/ceo', module: 'ceo', icon: LayoutDashboard },
  { label: 'Finance', href: '/finance', module: 'finance', icon: Coins },
  { label: 'CRM', href: '/crm', module: 'crm', icon: Users },
  { label: 'HR', href: '/hr', module: 'hr', icon: UserCircle },
  { label: 'Projects', href: '/projects', module: 'projects', icon: Briefcase },
  { label: 'Marketing', href: '/marketing', module: 'marketing', icon: Megaphone },
  { label: 'Software', href: '/software', module: 'software', icon: Code2 },
  { label: 'Branding', href: '/branding', module: 'branding', icon: Palette },
  { label: 'Influencer', href: '/influencer', module: 'influencer', icon: Star },
  { label: 'Sales', href: '/sales', module: 'sales', icon: TrendingUp },
] as const;

export function ModuleSwitcher(): JSX.Element | null {
  const pathname = usePathname();
  const { permissions } = usePermissions();

  const visible = MODULES.map((m) => {
    const route = MODULE_HOME_ROUTES.find((r) => r.module === m.module);
    const target = route?.candidatePaths.find((p) => isRouteAllowed(p, permissions));
    return target ? { ...m, target } : null;
  }).filter((m): m is typeof MODULES[number] & { target: string } => m !== null);

  if (visible.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-1 overflow-x-auto max-w-[220px] md:max-w-none">
      {visible.map((module) => {
        const active = pathname.startsWith(module.href);
        const Icon = module.icon;
        return (
          <Link
            key={module.href}
            href={module.target}
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
