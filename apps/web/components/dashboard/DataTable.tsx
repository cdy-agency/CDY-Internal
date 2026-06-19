'use client';

import type { ReactNode } from 'react';

interface DataTableProps {
  columns: string[];
  rows: ReactNode[][];
}

export function DataTable({ columns, rows }: DataTableProps): JSX.Element {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-cdy-navy-border">
          {columns.map((col, i) => (
            <th
              key={i}
              className="pb-2 text-left text-xs font-medium uppercase tracking-wide text-cdy-muted"
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr
            key={ri}
            className="border-b border-cdy-navy-border/50 transition-colors hover:bg-cdy-navy"
          >
            {row.map((cell, ci) => (
              <td
                key={ci}
                className={`py-2.5 text-sm ${
                  ci === 0
                    ? 'font-medium text-cdy-white'
                    : 'font-mono text-cdy-muted'
                }`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td
              colSpan={columns.length}
              className="py-6 text-center text-sm text-cdy-muted"
            >
              No data for this period
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
