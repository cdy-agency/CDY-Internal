import { PaymentMethod } from '@cdy/shared';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
  [PaymentMethod.MOBILE_MONEY]: 'Mobile Money',
  [PaymentMethod.MTN_MOMO]: 'MTN MoMo',
  [PaymentMethod.AIRTEL_MONEY]: 'Airtel Money',
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.CARD]: 'Card',
  [PaymentMethod.OTHER]: 'Other',
};

interface PaymentMethodBadgeProps {
  method: PaymentMethod;
}

export function PaymentMethodBadge({
  method,
}: PaymentMethodBadgeProps): JSX.Element {
  return (
    <span className="inline-flex rounded-full border border-cdy-navy-border bg-cdy-navy px-2.5 py-0.5 text-xs font-medium text-cdy-white">
      {METHOD_LABELS[method]}
    </span>
  );
}
