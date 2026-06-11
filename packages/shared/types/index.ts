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

export enum CommissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
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
  totalBillsPending: number;
  totalBillsOverdue: number;
  paymentsReceivedToday: number;
  expensesThisWeek: number;
  commissionsPending?: number;
  commissionsPendingValue?: number;
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
  totalBillsPending: number;
  totalBillsOverdue: number;
  paymentsReceivedToday: number;
  expensesThisWeek: number;
  commissionsPending: number;
  commissionsPendingValue: number;
  cashFlowAlert: boolean;
  previousMonth: FinanceSummaryMetrics & {
    totalDraftInvoices?: number;
    totalSentInvoices?: number;
  };
}

export enum NotificationType {
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',
  INVOICE_REMINDER_SENT = 'INVOICE_REMINDER_SENT',
  INVOICE_PAID = 'INVOICE_PAID',
  BILL_DUE_SOON = 'BILL_DUE_SOON',
  BILL_OVERDUE = 'BILL_OVERDUE',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  COMMISSION_APPROVED = 'COMMISSION_APPROVED',
  COMMISSION_REJECTED = 'COMMISSION_REJECTED',
  REMINDER_FAILED = 'REMINDER_FAILED',
  BUDGET_ALERT = 'BUDGET_ALERT',
  SYSTEM = 'SYSTEM',
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationRecord[];
  unreadCount: number;
}

export interface FinanceAuditLogRecord {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  logs: FinanceAuditLogRecord[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CashFlowLineItem {
  date: string;
  amount: number;
  label: string;
  type: 'INVOICE' | 'BILL' | 'ADJUSTMENT';
  invoiceId?: string;
  billId?: string;
}

export interface CashFlowWeekBucket {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  inflows: number;
  outflows: number;
  netFlow: number;
  runningBalance: number;
  inflowItems: CashFlowLineItem[];
  outflowItems: CashFlowLineItem[];
  isNegative: boolean;
}

export interface CashFlowForecast {
  openingBalance: number;
  forecastPeriod: { from: string; to: string; weeks: number };
  totalExpectedInflows: number;
  totalExpectedOutflows: number;
  lowestProjectedBalance: number;
  hasShortfall: boolean;
  hasShortfall30Days: boolean;
  shortfallWeeks: string[];
  weeks: CashFlowWeekBucket[];
  adjustments: CashFlowAdjustment[];
}

export interface CashFlowAdjustment {
  id: string;
  label: string;
  amount: number;
  direction: 'IN' | 'OUT';
  date: string;
}

export interface BalanceSheetData {
  asOf: string;
  assets: {
    accountsReceivable: number;
    cash: number;
    otherAssets: number;
    totalAssets: number;
  };
  liabilities: {
    accountsPayable: number;
    otherLiabilities: number;
    totalLiabilities: number;
  };
  equity: number;
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
  serviceType: string;
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

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
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

export interface PaginatedPayments {
  data: PaymentRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalCollectedThisMonth: number;
    paymentsThisMonth: number;
  };
}

export interface ExpenseRecord {
  id: string;
  vendorName: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  date: string;
  projectId: string | null;
  receiptUrl: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
}

export interface PaginatedExpenses {
  data: ExpenseRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    thisMonthTotal: number;
    topCategory: ExpenseCategory | null;
    topCategoryAmount: number;
    categoryCounts: { category: ExpenseCategory; count: number }[];
  };
}

export interface BillRecord {
  id: string;
  vendorName: string;
  category: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: BillStatus;
  paidAt: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  daysUntilDue: number;
  isOverdue: boolean;
  isDueSoon: boolean;
}

export interface PaginatedBills {
  data: BillRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  alerts: {
    dueSoonCount: number;
    dueSoonTotal: number;
    overdueCount: number;
    overdueTotal: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

export interface PlReportData {
  period: { from: string; to: string };
  revenue: {
    total: number;
    byServiceType: { serviceType: string; amount: number }[];
  };
  costOfServices: {
    total: number;
    byCategory: { category: ExpenseCategory; amount: number }[];
  };
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: {
    total: number;
    byCategory: { category: ExpenseCategory; amount: number }[];
  };
  netProfit: number;
  netMargin: number;
  previousPeriod: {
    totalRevenue: number;
    revenueByServiceType: { serviceType: string; amount: number }[];
    totalCOGS: number;
    cogsByCategory: { category: ExpenseCategory; amount: number }[];
    grossProfit: number;
    grossMargin: number;
    totalOpex: number;
    opexByCategory: { category: ExpenseCategory; amount: number }[];
    netProfit: number;
    netMargin: number;
  };
}

export interface AgeingBucketData {
  count: number;
  total: number;
  invoices: {
    id: string;
    invoiceNumber: string;
    clientId: string;
    total: number;
    remaining: number;
    dueDate: string;
    daysOverdue: number;
    status: InvoiceStatus;
  }[];
}

export interface AgeingReportData {
  asOf: string;
  totalOutstanding: number;
  buckets: {
    current: AgeingBucketData;
    days1_30: AgeingBucketData;
    days31_60: AgeingBucketData;
    days61_90: AgeingBucketData;
    days90plus: AgeingBucketData;
  };
}

export interface ExpenseReportData {
  month: string;
  monthKey: string;
  totalAmount: number;
  previousMonthTotal: number;
  momChangePercent: number;
  byCategory: {
    category: ExpenseCategory;
    amount: number;
    count: number;
    previousAmount: number;
    changePercent: number;
  }[];
  expenses: {
    id: string;
    vendorName: string;
    category: ExpenseCategory;
    amount: number;
    currency: string;
    date: string;
    projectId: string | null;
    receiptUrl: string | null;
  }[];
}

export interface CommissionRecord {
  id: string;
  agentId: string;
  dealId: string;
  dealValue: number;
  serviceType: string;
  ratePercent: number;
  calculatedAmount: number;
  adjustedAmount: number | null;
  adjustmentReason: string | null;
  month: string;
  status: CommissionStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  finalAmount: number;
  agent?: {
    id: string;
    firstName: string;
    lastName: string;
    role: Role;
  };
}

export interface PaginatedCommissions {
  data: CommissionRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    pending: number;
    approved: number;
    rejected: number;
    pendingValue: number;
    approvedValue: number;
  };
}
