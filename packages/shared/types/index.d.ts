export declare enum Role {
    CEO = "CEO",
    FINANCE_MANAGER = "FINANCE_MANAGER",
    SALES_AGENT = "SALES_AGENT",
    PROJECT_MANAGER = "PROJECT_MANAGER",
    OPERATIONS_MANAGER = "OPERATIONS_MANAGER",
    TEAM_MEMBER = "TEAM_MEMBER",
    CLIENT = "CLIENT"
}
export declare enum InvoiceStatus {
    DRAFT = "DRAFT",
    SENT = "SENT",
    PARTIALLY_PAID = "PARTIALLY_PAID",
    PAID = "PAID",
    OVERDUE = "OVERDUE",
    WRITTEN_OFF = "WRITTEN_OFF"
}
export declare enum PaymentMethod {
    BANK_TRANSFER = "BANK_TRANSFER",
    MOBILE_MONEY = "MOBILE_MONEY",
    CASH = "CASH",
    CARD = "CARD"
}
export declare enum ExpenseCategory {
    STAFF = "STAFF",
    SOFTWARE = "SOFTWARE",
    MARKETING = "MARKETING",
    OFFICE = "OFFICE",
    TRAVEL = "TRAVEL",
    SUPPLIER = "SUPPLIER",
    OTHER = "OTHER"
}
export declare enum BillStatus {
    UNPAID = "UNPAID",
    PARTIALLY_PAID = "PARTIALLY_PAID",
    PAID = "PAID"
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
    previousMonth: FinanceSummaryMetrics & {
        totalDraftInvoices?: number;
        totalSentInvoices?: number;
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
        categoryCounts: {
            category: ExpenseCategory;
            count: number;
        }[];
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
