'use client';

const VARIANTS = {
  green: {
    bg: 'bg-green-900/40',
    text: 'text-green-400',
    border: 'border-green-800',
  },
  blue: {
    bg: 'bg-blue-900/40',
    text: 'text-blue-400',
    border: 'border-blue-800',
  },
  amber: {
    bg: 'bg-amber-900/40',
    text: 'text-amber-400',
    border: 'border-amber-800',
  },
  red: {
    bg: 'bg-red-900/40',
    text: 'text-red-400',
    border: 'border-red-800',
  },
  gray: {
    bg: 'bg-gray-800/40',
    text: 'text-gray-400',
    border: 'border-gray-700',
  },
} as const;

type Variant = keyof typeof VARIANTS;

interface QualityBadgeProps {
  label: string;
  variant?: Variant;
}

export function QualityBadge({ label, variant = 'green' }: QualityBadgeProps): JSX.Element {
  const v = VARIANTS[variant];
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${v.bg} ${v.text} ${v.border}`}
    >
      {label}
    </span>
  );
}
