import { redirect } from 'next/navigation';

export default function NewInvoiceRedirect(): never {
  redirect('/finance/invoices');
}
