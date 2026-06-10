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
}
export interface FinanceSummary {
    totalInvoiced: number;
    totalCollected: number;
    outstanding: number;
    overdue: number;
    totalExpenses: number;
    netCashPosition: number;
    previousMonth: FinanceSummaryMetrics;
}
export interface ApiResponse<T> {
    data: T;
    message: string;
    statusCode: number;
}
