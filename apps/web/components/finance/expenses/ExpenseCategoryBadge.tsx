import { ExpenseCategory } from '@cdy/shared';

const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; className: string }
> = {
  [ExpenseCategory.STAFF]: {
    label: 'Staff & Payroll',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  [ExpenseCategory.SOFTWARE]: {
    label: 'Software & Technology',
    className: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  [ExpenseCategory.MARKETING]: {
    label: 'Marketing',
    className: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  },
  [ExpenseCategory.OFFICE]: {
    label: 'Office & Admin',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  [ExpenseCategory.TRAVEL]: {
    label: 'Travel',
    className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  [ExpenseCategory.SUPPLIER]: {
    label: 'Supplier / Vendor',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  [ExpenseCategory.COMMISSION]: {
    label: 'Commission',
    className: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  },
  [ExpenseCategory.INFLUENCER_PAYMENT]: {
    label: 'Influencer Payment',
    className: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  },
  [ExpenseCategory.LOAN]: {
    label: 'Loan',
    className: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
  [ExpenseCategory.OTHER]: {
    label: 'Other',
    className: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  },
};

interface ExpenseCategoryBadgeProps {
  category: ExpenseCategory;
}

export function ExpenseCategoryBadge({
  category,
}: ExpenseCategoryBadgeProps): JSX.Element {
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG[ExpenseCategory.OTHER];
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export const EXPENSE_CATEGORIES = Object.entries(CATEGORY_CONFIG).map(
  ([value, config]) => ({
    value: value as ExpenseCategory,
    label: config.label,
    className: config.className,
  }),
);

/** General categories used on income and bill forms. Overlaps with expense categories for consistency. */
export const FINANCE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'STAFF', label: 'Staff & Payroll' },
  { value: 'SOFTWARE', label: 'Software & Technology' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'OFFICE', label: 'Office & Admin' },
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'SUPPLIER', label: 'Supplier / Vendor' },
  { value: 'COMMISSION', label: 'Commission' },
  { value: 'SERVICES', label: 'Services / Consulting' },
  { value: 'SALES', label: 'Sales' },
  { value: 'RENTAL', label: 'Rental' },
  { value: 'LOAN', label: 'Loan' },
  { value: 'OTHER', label: 'Other' },
];
