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
  totalClients: number;
  newClientsThisMonth: number;
  cashFlowAlert: boolean;
  ventures: {
    count: number;
    totalIncomeMTD: number;
    totalExpensesMTD: number;
  };
  totalActiveEmployees: number;
  totalMonthlyPayroll: number;
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
  client?: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string | null;
    country: string;
    city: string | null;
    address: string | null;
  } | null;
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

export enum LeadSource {
  WEBSITE = 'WEBSITE',
  REFERRAL = 'REFERRAL',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  COLD_OUTREACH = 'COLD_OUTREACH',
  EVENT = 'EVENT',
  PARTNER = 'PARTNER',
  RETURNING_CLIENT = 'RETURNING_CLIENT',
  OTHER = 'OTHER',
}

export enum PipelineStage {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
}

export enum ActivityType {
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  MEETING = 'MEETING',
  WHATSAPP = 'WHATSAPP',
  NOTE = 'NOTE',
}

export enum ProposalStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export interface LeadRecord {
  id: string;
  contactName: string;
  companyName: string;
  email: string;
  phone: string | null;
  country: string;
  serviceInterest: string;
  source: LeadSource;
  estimatedValue: number | null;
  currency: string;
  stage: PipelineStage;
  qualityScore: number | null;
  assignedTo: string | null;
  clientId: string | null;
  notes: string | null;
  lostReason: string | null;
  convertedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivityRecord {
  id: string;
  leadId: string;
  type: ActivityType;
  summary: string;
  outcome: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  duration: number | null;
  performedBy: string;
  performedAt: string;
  createdAt: string;
}

export interface ProposalRecord {
  id: string;
  leadId: string;
  title: string;
  serviceType: string;
  estimatedValue: number;
  currency: string;
  status: ProposalStatus;
  sentAt: string | null;
  expiresAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lead?: {
    id: string;
    companyName: string;
    contactName: string;
    assignedTo: string | null;
  };
}

export interface ClientRecord {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  country: string;
  city: string | null;
  address: string | null;
  website: string | null;
  industry: string | null;
  notes: string | null;
  assignedTo: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  financeSummary?: {
    totalInvoiced: number;
    invoiceCount: number;
    outstanding: number;
  };
}

export interface ClientSearchResult {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  country: string;
}

export interface PipelineColumn {
  stage: PipelineStage;
  leads: LeadRecord[];
  totalValue: number;
  count: number;
}

export interface CrmSummary {
  totalLeads: number;
  totalLeadsThisMonth: number;
  totalInPipeline: number;
  totalClosedWonThisMonth: number;
  totalClosedLostThisMonth: number;
  totalPipelineValue: number;
  conversionRate: number;
  totalClients: number;
  averageQualityScore: number;
  leadsByStage: Record<PipelineStage, number>;
  leadsBySource: Record<LeadSource, number>;
  topAgents: Array<{
    agentId: string;
    agentName: string;
    closedWon: number;
    totalValue: number;
  }>;
  recentActivities: Array<{
    id: string;
    leadId: string;
    type: ActivityType;
    summary: string;
    performedAt: string;
    companyName: string;
    performedByName: string;
  }>;
  overdueFollowUps: Array<{
    leadId: string;
    companyName: string;
    nextAction: string;
    nextActionDate: string;
  }>;
  proposalsSent: number;
  proposalsAccepted: number;
  proposalAcceptanceRate: number;
  leadsWithOverdueFollowUp: number;
  avgDaysToClose: number;
  pipelineValueByStage: Record<PipelineStage, number>;
}

export interface PipelineStageHistoryRecord {
  id: string;
  leadId: string;
  fromStage: PipelineStage | null;
  toStage: PipelineStage;
  movedBy: string;
  movedByName?: string;
  movedAt: string;
  daysInPrev: number | null;
}

export interface LeadOverdueFollowUp {
  nextAction: string;
  nextActionDate: string;
  daysOverdue: number;
}

export interface AgentDashboard {
  month: string;
  target: SalesTargetRecord | null;
  performance: {
    revenueWon: number;
    dealsWon: number;
    revenueProgress: number | null;
    dealsProgress: number | null;
  };
  closedDeals: Array<{
    id: string;
    companyName: string;
    estimatedValue: number | null;
    convertedAt: string | null;
    serviceInterest: string;
  }>;
  pipeline: {
    openLeads: number;
    pipelineValue: number;
  };
  commission: {
    total: number;
    approved: number;
    pending: number;
    records: Array<{
      id: string;
      dealId: string;
      dealValue: number;
      ratePercent: number;
      calculatedAmount: number;
      adjustedAmount: number | null;
      status: string;
      companyName: string;
    }>;
  };
  activities: number;
  activitiesByType: Record<string, number>;
  overdueFollowUps: number;
  overdueItems: Array<{
    leadId: string;
    companyName: string;
    nextAction: string;
    nextActionDate: string;
  }>;
}

export interface SalesTargetRecord {
  id: string;
  agentId: string;
  month: string;
  revenueTarget: number;
  dealsTarget: number;
  currency: string;
  setBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyTargetPerformance extends SalesTargetRecord {
  agentName: string;
  actual: { dealsWon: number; revenueWon: number };
  revenueProgress: number;
  dealsProgress: number;
  commissionTotal: number;
}

export interface ConversionReport {
  period: { from: string; to: string };
  funnel: {
    totalCreated: number;
    byStage: Partial<Record<PipelineStage, number>>;
    closedWon: number;
    closedLost: number;
  };
  metrics: {
    conversionRate: number;
    totalRevenue: number;
    avgDealValue: number;
    totalClosed: number;
    avgDaysToClose: number;
  };
  lostReasons: Array<{ reason: string; count: number }>;
  bySource: Array<{
    source: LeadSource;
    count: number;
    revenue: number;
  }>;
  agentPerformance: Array<{
    agentId: string;
    agentName: string;
    dealsWon: number;
    revenue: number;
  }>;
}

export interface ClientActivityRecord extends LeadActivityRecord {
  performedByName: string;
  leadCompanyName: string;
}

export interface ClientInvoiceSummary {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  dueDate: string;
  currency: string;
  createdAt: string;
}

export interface CrmAuditLogRecord {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface CrmAuditLogResponse {
  data: CrmAuditLogRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SavedFilterRecord {
  id: string;
  userId: string;
  name: string;
  filters: Record<string, unknown>;
  module: string;
  createdAt: string;
}

export interface CrmScoreWeights {
  source: number;
  value: number;
  contact: number;
  engagement: number;
}

export interface SalesPerformanceReport {
  period: { from: string; to: string };
  totals: {
    totalRevenue: number;
    totalDealsWon: number;
    totalCommission: number;
    avgConversionRate: number;
  };
  agents: Array<{
    agentId: string;
    agentName: string;
    email: string;
    performance: {
      dealsWon: number;
      dealsLost: number;
      totalRevenue: number;
      avgDealValue: number;
      conversionRate: number;
      activitiesCount: number;
      proposalsSent: number;
      totalCommission: number;
    };
    target: {
      revenueTarget: number;
      dealsTarget: number;
      revenueProgress: number | null;
      dealsProgress: number | null;
    } | null;
    deals: Array<{
      serviceType: string;
      value: number;
      source: LeadSource;
      closedAt: string | null;
    }>;
  }>;
}

export interface SourceAnalysisReport {
  period: { from: string; to: string };
  sources: Array<{
    source: LeadSource;
    totalLeads: number;
    dealsWon: number;
    dealsLost: number;
    totalRevenue: number;
    conversionRate: number;
    avgDealValue: number;
  }>;
}

// ─── HR Module ─────────────────────────────────────────────────

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERN = 'INTERN',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  RESIGNED = 'RESIGNED',
  TERMINATED = 'TERMINATED',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
  ON_LEAVE = 'ON_LEAVE',
  PUBLIC_HOLIDAY = 'PUBLIC_HOLIDAY',
  WEEKEND = 'WEEKEND',
}

export interface DepartmentRecord {
  id: string;
  name: string;
  description: string | null;
  headId: string | null;
  employeeCount?: number;
  isActive: boolean;
}

export interface EmployeeDirectReport {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
}

export interface EmployeeRecord {
  id: string;
  userId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  profilePhotoUrl: string | null;
  jobTitle: string;
  departmentId: string | null;
  departmentName: string | null;
  managerId: string | null;
  managerName: string | null;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  startDate: string;
  endDate: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  directReports: EmployeeDirectReport[];
  baseSalary?: number;
  salaryEffectiveFrom?: string;
  nationalId?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  createdBy?: string;
}

export interface EmployeeDirectoryRecord {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string | null;
  departmentName: string | null;
  profilePhotoUrl: string | null;
  status: EmployeeStatus;
}

export interface AvailableUserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface HrSummary {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveToday: number;
  newThisMonth: number;
  byDepartment: Array<{ department: string; count: number }>;
  byStatus: Record<EmployeeStatus, number>;
  pendingLeaveRequests: number;
  attendanceToday: {
    checkedIn: number;
    notYetCheckedIn: number;
    onLeave: number;
  };
  upcomingLeave: Array<{
    employeeId: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
  }>;
}

export interface LeaveTypeRecord {
  id: string;
  name: string;
  code: string;
  defaultDaysPerYear: number;
  isPaid: boolean;
  requiresApproval: boolean;
  requiresDocument: boolean;
  isActive: boolean;
  createdAt?: string;
}

export interface LeaveBalanceRecord {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  entitled: number;
  used: number;
  pending: number;
  remaining: number;
  carryOver: number;
  leaveType: LeaveTypeRecord;
}

export interface LeaveRequestEmployeeSummary {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  departmentId?: string | null;
  userId?: string;
}

export interface LeaveRequestRecord {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  documentUrl: string | null;
  status: LeaveStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  leaveType: LeaveTypeRecord;
  employee: LeaveRequestEmployeeSummary;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  workingHours: number | null;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    departmentId: string | null;
    department?: { name: string } | null;
  };
}

export interface AttendanceMonthlyReport {
  month: string;
  employeeId: string;
  summary: {
    totalWorkingDays: number;
    present: number;
    absent: number;
    halfDay: number;
    onLeave: number;
    totalHours: number;
  };
  records: AttendanceRecord[];
}

export interface MyAttendanceResponse {
  today: AttendanceRecord | null;
  report: AttendanceMonthlyReport;
}

export type HrSettings = Record<string, string>;

export interface CreateEmployeePayload {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePhotoUrl?: string;
  jobTitle: string;
  departmentId?: string;
  managerId?: string;
  employmentType: EmploymentType;
  startDate: string;
  baseSalary: number;
  currency?: string;
  salaryEffectiveFrom?: string;
  nationalId?: string;
  bankName?: string;
  bankAccount?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export interface UpdateEmployeePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  profilePhotoUrl?: string;
  jobTitle?: string;
  departmentId?: string;
  managerId?: string;
  employmentType?: EmploymentType;
  startDate?: string;
  baseSalary?: number;
  currency?: string;
  salaryEffectiveFrom?: string;
  nationalId?: string;
  bankName?: string;
  bankAccount?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export interface CreateLeaveRequestPayload {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  documentUrl?: string;
}

export interface ReviewLeaveRequestPayload {
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

export enum ReviewStatus {
  DRAFT = 'DRAFT',
  SELF_ASSESSMENT = 'SELF_ASSESSMENT',
  MANAGER_REVIEW = 'MANAGER_REVIEW',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  COMPLETED = 'COMPLETED',
}

export enum OnboardingStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
}

export interface PerformanceReviewEmployeeSummary {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
}

export interface PerformanceReviewRecord {
  id: string;
  employeeId: string;
  reviewerId: string;
  period: string;
  reviewDate: string;
  status: ReviewStatus;
  goalsSet: unknown;
  selfAssessment: string | null;
  selfRating: number | null;
  managerNotes: string | null;
  overallRating: number | null;
  strengths: string | null;
  improvements: string | null;
  nextPeriodGoals: unknown;
  acknowledgedAt: string | null;
  nextReviewDate: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: PerformanceReviewEmployeeSummary;
}

export interface SalaryHistoryRecord {
  id: string;
  previousSalary: number;
  newSalary: number;
  currency: string;
  effectiveFrom: string;
  reason: string | null;
  changedBy: string;
  createdAt: string;
}

export interface EmployeeSalaryData {
  current: {
    baseSalary: number;
    currency: string;
    effectiveFrom: string;
  };
  history: SalaryHistoryRecord[];
}

export interface OnboardingItemRecord {
  id: string;
  checklistId: string;
  title: string;
  description: string | null;
  category: string;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: string | null;
  dueDate: string | null;
  order: number;
}

export interface OnboardingChecklistRecord {
  id: string;
  employeeId: string;
  status: OnboardingStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OnboardingItemRecord[];
  progress: { completed: number; total: number };
}

export interface HrAuditLogRecord {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface HrHeadcountReport {
  total: number;
  active: number;
  byDepartment: Record<string, number>;
  byStatus: Record<string, number>;
  byEmploymentType: Record<string, number>;
}

export interface HrTurnoverReport {
  period: { from: string; to: string };
  newHires: number;
  terminations: number;
  turnoverRate: number;
  avgHeadcount: number;
  terminated: Array<{
    name: string;
    department: string | null;
    endDate: string | null;
    status: string;
  }>;
}

export interface HrLeaveUtilisationReport {
  year: number;
  byType: Array<{
    leaveType: string;
    employees: number;
    totalEntitled: number;
    totalUsed: number;
    utilisationRate: number;
    avgUsedPerEmployee: number;
  }>;
}

export interface HrAttendanceSummaryReport {
  period: { from: string; to: string };
  summary: Array<{
    employeeId: string;
    employeeName: string;
    present: number;
    absent: number;
    halfDay: number;
    onLeave: number;
    totalHours: number;
  }>;
}

export interface UpdateSalaryPayload {
  newSalary: number;
  currency?: string;
  effectiveFrom: string;
  reason?: string;
}

export interface CreatePerformanceReviewPayload {
  employeeId: string;
  reviewerId: string;
  period: string;
  reviewDate: string;
  goalsSet?: object[];
  nextReviewDate?: string;
}
