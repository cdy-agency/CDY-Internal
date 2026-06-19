'use client';

import type { ReactNode } from 'react';

interface SectionCardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, action, children, className }: SectionCardProps): JSX.Element {
  return (
    <div
      className={`rounded-xl border border-cdy-navy-border bg-cdy-navy-light p-5 ${className ?? ''}`}
    >
      {(title ?? action) ? (
        <div className="mb-4 flex items-center justify-between">
          {title && (
            <h3 className="text-xs font-semibold uppercase tracking-wide text-cdy-white">
              {title}
            </h3>
          )}
          {action}
        </div>
      ) : null}
      {children}
    </div>
  );
}
