/** Non-VOID credit notes reduce what the client still owes. */
export function sumNonVoidCreditNotes(
  creditNotes: Array<{ amount: number; status?: string | null }> = [],
): number {
  return creditNotes
    .filter((cn) => cn.status !== 'VOID')
    .reduce((sum, cn) => sum + cn.amount, 0);
}

export function sumPaymentAmounts(
  payments: Array<{ amount: number }> = [],
): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Outstanding balance = invoice total − payments − non-VOID credit notes.
 * Clamped at zero.
 */
export function invoiceRemainingBalance(params: {
  total: number;
  payments?: Array<{ amount: number }>;
  creditNotes?: Array<{ amount: number; status?: string | null }>;
}): number {
  const paid = sumPaymentAmounts(params.payments);
  const credited = sumNonVoidCreditNotes(params.creditNotes);
  return Math.max(0, Number((params.total - paid - credited).toFixed(2)));
}
