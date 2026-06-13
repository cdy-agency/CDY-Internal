export enum Role {
  CEO = 'CEO',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  SALES_AGENT = 'SALES_AGENT',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  TEAM_MEMBER = 'TEAM_MEMBER',
  CLIENT = 'CLIENT',
  IT = 'IT',
}

export type PermissionMap = Record<
  string,
  { canRead: boolean; canWrite: boolean }
>;

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

export enum WriteOffCategory {
  CLIENT_DISPUTE = 'CLIENT_DISPUTE',
  CLIENT_INSOLVENT = 'CLIENT_INSOLVENT',
  AGREED_WRITE_OFF = 'AGREED_WRITE_OFF',
  UNCOLLECTABLE = 'UNCOLLECTABLE',
  OTHER = 'OTHER',
}

export enum CreditNoteReason {
  OVERCHARGE = 'OVERCHARGE',
  SERVICE_NOT_DELIVERED = 'SERVICE_NOT_DELIVERED',
  DISCOUNT_AGREED = 'DISCOUNT_AGREED',
  REFUND_APPROVED = 'REFUND_APPROVED',
  OTHER = 'OTHER',
}

export enum CreditNoteStatus {
  ISSUED = 'ISSUED',
  REFUND_PENDING = 'REFUND_PENDING',
  REFUND_PAID = 'REFUND_PAID',
  VOID = 'VOID',
}

export enum PaymentPlanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum InstalmentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum ReconciliationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DISCREPANCY = 'DISCREPANCY',
}

export enum TransactionMatchStatus {
  MATCHED = 'MATCHED',
  UNMATCHED = 'UNMATCHED',
  MANUALLY_RESOLVED = 'MANUALLY_RESOLVED',
  IGNORED = 'IGNORED',
}

export enum TransactionResolution {
  LINK_PAYMENT = 'LINK_PAYMENT',
  LINK_EXPENSE = 'LINK_EXPENSE',
  CREATE_EXPENSE = 'CREATE_EXPENSE',
  BANK_CHARGE = 'BANK_CHARGE',
  IGNORE = 'IGNORE',
}

export type ArRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'CURRENT';

export interface UserProfile {
  id: string;
  email: string;
  roleKey: string;
  roleName: string;
  firstName: string;
  lastName: string;
  permissions?: PermissionMap;
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
  activePaymentPlans: number;
  creditNotesIssuedMTD: number;
  creditNotesValueMTD: number;
  pendingReconciliations: number;
  totalMRR: number;
  activeRetainers: number;
  retainersUpForRenewal: number;
  taxOwed: number;
  blockedProjects: number;
  cashFlowAlert: boolean;
  ventures: {
    count: number;
    totalIncomeMTD: number;
    totalExpensesMTD: number;
  };
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

export interface BalanceSheetManualEntry {
  id: string;
  label: string;
  amount: number;
  currency: string;
  asOfDate: string;
}

export interface BalanceSheetData {
  asOf: string;
  assets: {
    accountsReceivable: number;
    manual: BalanceSheetManualEntry[];
    totalAssets: number;
  };
  liabilities: {
    accountsPayable: number;
    manual: BalanceSheetManualEntry[];
    totalLiabilities: number;
  };
  equity: number;
  previousPeriod: {
    totalAssets: number;
    totalLiabilities: number;
    equity: number;
  } | null;
}

export enum PayrollStatus {
  DRAFT = 'DRAFT',
  PROCESSED = 'PROCESSED',
  LOCKED = 'LOCKED',
}

export interface PayrollLineItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  baseSalary: number;
  commission: number;
  bonus: number;
  grossPay: number;
  taxDeduction: number;
  otherDeductions: number;
  netPay: number;
  payslipSent: boolean;
  payslipUrl: string | null;
  notes: string | null;
  adjustedBy: string | null;
  adjustmentReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRun {
  id: string;
  month: string;
  status: PayrollStatus;
  processedAt: string | null;
  processedBy: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  currency: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lineItems: PayrollLineItem[];
}

export interface EmployeeSalary {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  baseSalary: number;
  currency: string;
  effectiveFrom: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionRuleGroup {
  agentId: string;
  agentName: string;
  rules: CommissionRule[];
}

export interface CommissionRule {
  id: string;
  agentId: string;
  serviceType: string | null;
  ratePercent: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  agent?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
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
  writeOffReason: string | null;
  writeOffCategory: WriteOffCategory | null;
  creditTermsDays: number;
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
  creditNotes: CreditNoteRecord[];
  paymentPlan: PaymentPlanRecord | null;
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
    roleKey: string;
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

export interface CreditNoteRecord {
  id: string;
  creditNoteNumber: string;
  invoiceId: string;
  amount: number;
  reason: CreditNoteReason | string;
  description: string;
  status: CreditNoteStatus | string;
  issuedAt: string;
  refundDue: boolean;
  refundPaidAt: string | null;
  createdAt: string;
}

export interface PaymentPlanInstalment {
  id: string;
  instalmentNumber: number;
  amount: number;
  dueDate: string;
  status: InstalmentStatus | string;
  paidAt: string | null;
  paymentId: string | null;
}

export interface PaymentPlanRecord {
  id: string;
  invoiceId: string;
  totalAmount: number;
  status: PaymentPlanStatus | string;
  createdAt: string;
  instalments: PaymentPlanInstalment[];
}

export interface ArLedgerInvoiceRow {
  id: string;
  invoiceNumber: string;
  total: number;
  remaining: number;
  dueDate: string;
  status: InvoiceStatus;
  daysOverdue: number;
}

export interface ArLedgerClientRow {
  clientId: string;
  invoiceCount: number;
  totalOutstanding: number;
  oldestDueDate: string;
  daysOldest: number;
  riskLevel: ArRiskLevel;
  invoices: ArLedgerInvoiceRow[];
}

export interface ArLedgerData {
  asOf: string;
  totalAR: number;
  clientCount: number;
  highRiskCount: number;
  ledger: ArLedgerClientRow[];
}

export interface BankStatementRecord {
  id: string;
  periodFrom: string;
  periodTo: string;
  importedAt: string;
  importedBy: string;
  status: ReconciliationStatus;
  completedAt: string | null;
  openingBalance: number;
  closingBalance: number;
  transactionCount: number;
  matchedCount: number;
  unmatchedCount: number;
}

export interface BankTransactionRecord {
  id: string;
  transactionDate: string;
  description: string;
  debitAmount: number | null;
  creditAmount: number | null;
  balance: number;
  reference: string | null;
  matchStatus: TransactionMatchStatus;
  matchedEntityType: string | null;
  matchedEntityId: string | null;
  resolvedNote: string | null;
}

export interface ReconciliationDetail extends BankStatementRecord {
  transactions: BankTransactionRecord[];
}

export interface ReconciliationImportResult {
  statementId: string;
  transactionCount: number;
  matchedCount: number;
  unmatchedCount: number;
  periodFrom: string;
  periodTo: string;
}

export interface ReconciliationCompleteResult {
  status: ReconciliationStatus;
  systemBalance: number;
  bankBalance: number;
  difference: number;
}

export enum RetainerStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED',
}

export enum BudgetRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface TaxRateRecord {
  id: string;
  name: string;
  ratePercent: number;
  country: string;
  serviceType: string | null;
  effectiveFrom: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxPaymentRecord {
  id: string;
  authorityName: string;
  amount: number;
  currency: string;
  paidAt: string;
  reference: string | null;
  periodFrom: string;
  periodTo: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface TaxLiabilityReport {
  period: { from: string; to: string };
  taxCollected: {
    total: number;
    byRate: {
      taxRateId: string | null;
      rateName: string;
      ratePercent: number;
      invoiceCount: number;
      grossRevenue: number;
      taxAmount: number;
    }[];
  };
  inputTax: number;
  totalRemitted: number;
  netOwed: number;
  remittances: TaxPaymentRecord[];
  warning: string | null;
}

export interface RetainerRecord {
  id: string;
  clientId: string;
  serviceName: string;
  description: string | null;
  amount: number;
  currency: string;
  billingDayOfMonth: number;
  startDate: string;
  endDate: string | null;
  status: RetainerStatus;
  taxRateId: string | null;
  taxRate: { id: string; name: string; ratePercent: number } | null;
  nextBillingDate: string;
  lastBilledAt: string | null;
  pausedAt: string | null;
  pauseReason: string | null;
  endedAt: string | null;
  endReason: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetainerMRRSummary {
  activeCount: number;
  totalMRR: number;
  totalARR: number;
  mrrByCurrency: Record<string, number>;
  upForRenewal: RetainerRecord[];
  recentChurn: RetainerRecord[];
  pausedCount: number;
}

export interface ProjectBudgetStatus {
  projectId: string;
  projectName: string;
  clientId: string;
  currency: string;
  approvedBudget: number;
  totalCosts: number;
  remainingBudget: number;
  percentConsumed: number;
  projectedFinalCost: number;
  isOverBudget: boolean;
  isBlocked: boolean;
  alertThresholdPct: number;
  pendingRequest: BudgetIncreaseRequestRecord | null;
  expenses?: {
    id: string;
    vendorName: string;
    category: string;
    amount: number;
    date: string;
  }[];
}

export interface BudgetIncreaseRequestRecord {
  id: string;
  projectId: string;
  currentBudget: number;
  requestedBudget: number;
  justification: string;
  requestedBy: string;
  status: BudgetRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  projectName?: string;
}

export interface VentureRecord {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VentureIncomeRecord {
  id: string;
  ventureId: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  reference: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VentureExpenseRecord {
  id: string;
  ventureId: string;
  description: string;
  totalAmount: number;
  ventureShare: number;
  ventureAmount: number;
  currency: string;
  category: ExpenseCategory;
  date: string;
  isShared: boolean;
  cdyShare: number | null;
  receiptUrl: string | null;
  notes: string | null;
  expenseId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VentureCategoryBreakdown {
  category: string;
  amount: number;
}

export interface VenturePeriodSummary {
  ventureId: string;
  period: { from: string; to: string };
  income: {
    total: number;
    count: number;
    byCategory: VentureCategoryBreakdown[];
  };
  expenses: {
    total: number;
    count: number;
    byCategory: VentureCategoryBreakdown[];
  };
  netProfit: number;
  margin: number;
}

export interface VentureCardSummary extends VenturePeriodSummary {
  venture: { id: string; name: string; color: string };
}

export interface AllVenturesSummary {
  period: { from: string; to: string };
  totals: {
    totalIncome: number;
    totalExpenses: number;
    totalNetProfit: number;
  };
  ventures: VentureCardSummary[];
}
