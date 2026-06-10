export enum Role {
  CEO = 'CEO',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  SALES_AGENT = 'SALES_AGENT',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  TEAM_MEMBER = 'TEAM_MEMBER',
  CLIENT = 'CLIENT',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CASH = 'CASH',
  CARD = 'CARD',
}

export enum ExpenseCategory {
  STAFF = 'STAFF',
  SOFTWARE = 'SOFTWARE',
  MARKETING = 'MARKETING',
  OFFICE = 'OFFICE',
  TRAVEL = 'TRAVEL',
  SUPPLIER = 'SUPPLIER',
  OTHER = 'OTHER',
}

export enum BillStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface FinanceSummaryMetrics {
  totalInvoiced: number;
  totalCollected: number;
  outstanding: number;
  overdue: number;
  totalExpenses: number;
  netCashPosition: number;
}

export interface FinanceSummary {
  totalInvoiced: number;
  totalCollected: number;
  outstanding: number;
  overdue: number;
  totalExpenses: number;
  netCashPosition: number;
  totalDraftInvoices: number;
  totalSentInvoices: number;
  previousMonth: FinanceSummaryMetrics;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  clientId: string;
  projectId: string | null;
  status: InvoiceStatus;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  dueDate: string;
  sentAt: string | null;
  paidAt: string | null;
  writtenOffAt: string | null;
  writtenOffBy: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paidAt: string;
  receiptSent: boolean;
  notes: string | null;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDetail extends InvoiceRecord {
  payments: InvoicePayment[];
}

export interface PaginatedInvoices {
  data: InvoiceRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}
