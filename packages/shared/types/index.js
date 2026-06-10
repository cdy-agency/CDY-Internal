"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillStatus = exports.ExpenseCategory = exports.PaymentMethod = exports.InvoiceStatus = exports.Role = void 0;
var Role;
(function (Role) {
    Role["CEO"] = "CEO";
    Role["FINANCE_MANAGER"] = "FINANCE_MANAGER";
    Role["SALES_AGENT"] = "SALES_AGENT";
    Role["PROJECT_MANAGER"] = "PROJECT_MANAGER";
    Role["OPERATIONS_MANAGER"] = "OPERATIONS_MANAGER";
    Role["TEAM_MEMBER"] = "TEAM_MEMBER";
    Role["CLIENT"] = "CLIENT";
})(Role || (exports.Role = Role = {}));
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "DRAFT";
    InvoiceStatus["SENT"] = "SENT";
    InvoiceStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    InvoiceStatus["PAID"] = "PAID";
    InvoiceStatus["OVERDUE"] = "OVERDUE";
    InvoiceStatus["WRITTEN_OFF"] = "WRITTEN_OFF";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["MOBILE_MONEY"] = "MOBILE_MONEY";
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CARD"] = "CARD";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var ExpenseCategory;
(function (ExpenseCategory) {
    ExpenseCategory["STAFF"] = "STAFF";
    ExpenseCategory["SOFTWARE"] = "SOFTWARE";
    ExpenseCategory["MARKETING"] = "MARKETING";
    ExpenseCategory["OFFICE"] = "OFFICE";
    ExpenseCategory["TRAVEL"] = "TRAVEL";
    ExpenseCategory["SUPPLIER"] = "SUPPLIER";
    ExpenseCategory["OTHER"] = "OTHER";
})(ExpenseCategory || (exports.ExpenseCategory = ExpenseCategory = {}));
var BillStatus;
(function (BillStatus) {
    BillStatus["UNPAID"] = "UNPAID";
    BillStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    BillStatus["PAID"] = "PAID";
})(BillStatus || (exports.BillStatus = BillStatus = {}));
//# sourceMappingURL=index.js.map