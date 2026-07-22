/** Non-VOID credit notes reduce what the client still owes. */
export function sumNonVoidCreditNotes(
  creditNotes: Array<{ amount: unknown; status?: string | null }> = [],
): number {
  return creditNotes
    .filter((cn) => cn.status !== 'VOID')
    .reduce((sum, cn) => sum + Number(cn.amount), 0);
}

export function sumPaymentAmounts(
  payments: Array<{ amount: unknown }> = [],
): number {
  return payments.reduce((sum, p) => sum + Number(p.amount), 0);
}

/**
 * Outstanding balance = invoice total − payments − non-VOID credit notes.
 * Clamped at zero.
 */
export function invoiceRemainingBalance(params: {
  total: unknown;
  payments?: Array<{ amount: unknown }>;
  creditNotes?: Array<{ amount: unknown; status?: string | null }>;
}): number {
  const total = Number(params.total);
  const paid = sumPaymentAmounts(params.payments);
  const credited = sumNonVoidCreditNotes(params.creditNotes);
  return Math.max(0, Number((total - paid - credited).toFixed(2)));
}

export function isInvoiceFullySettled(params: {
  total: unknown;
  payments?: Array<{ amount: unknown }>;
  creditNotes?: Array<{ amount: unknown; status?: string | null }>;
}): boolean {
  return invoiceRemainingBalance(params) <= 0.001;
}
