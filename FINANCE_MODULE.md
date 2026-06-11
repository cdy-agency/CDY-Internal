# CDY Finance Module — Complete Reference

## Version
v2.0.0 — released June 2026

## Overview
The CDY Finance Module is the complete financial management system for CDY Agency.
It covers the full money lifecycle: invoicing, payments, expenses, payroll, reporting, and compliance.

## Modules

### Core
| Module | Endpoints | Description |
|---|---|---|
| Invoices | 9 | Create, send, PDF, track invoices |
| Payments | 3 | Record and reconcile payments |
| Expenses | 5 | Log and categorise expenses |
| Bills | 6 | Track supplier bills and payables |

### Advanced
| Module | Endpoints | Description |
|---|---|---|
| AR Ledger | 2 | Accounts receivable by client |
| Credit Notes | 5 | Issue credits and refunds |
| Payment Plans | 4 | Instalment payment schedules |
| Reconciliation | 5 | Bank statement matching |

### Compliance
| Module | Endpoints | Description |
|---|---|---|
| Tax | 8 | Tax rates, liability report, remittances |
| Audit Log | 2 | Tamper-proof action trail |

### Revenue
| Module | Endpoints | Description |
|---|---|---|
| Retainers | 9 | Monthly recurring billing |
| Commissions | 12 | Agent commission calculation and rules |
| Payroll | 8 | Monthly salary runs and payslips |

### Reporting
| Report | Endpoint | Description |
|---|---|---|
| Profit & Loss | /reports/pl | Revenue, costs, net profit |
| Invoice Ageing | /reports/ageing | Outstanding by overdue period |
| Expense Summary | /reports/expenses | Spending by category |
| Cash Flow | /reports/cashflow | 90-day projection |
| Balance Sheet | /reports/balance-sheet | Assets, liabilities, equity |
| Tax Liability | /tax/report | Tax collected and owed |

### Configuration
| Module | Endpoints | Description |
|---|---|---|
| Settings | 2 | Company details, invoice prefix, payroll config |

## Automation (cron jobs)
| Time | Job | Description |
|---|---|---|
| 7:00am | retainer-auto-billing | Auto-generates retainer invoices |
| 8:00am | overdue-invoice-detection | Flags overdue invoices |
| 8:05am | invoice-reminder-cascade | Sends reminder emails |
| 8:10am | bill-due-alerts | Alerts on upcoming bill due dates |
| 8:15am | payment-plan-instalment-alerts | Flags overdue instalments |
| 8:20am | budget-alerts | Alerts on project budget thresholds |

## Role permissions
See `apps/api/src/finance/rbac-audit.md` for the complete role matrix.

## Environment variables
See `apps/api/.env.example` for required environment variables.

## Running locally
```bash
pnpm dev:docker        # Start all services
pnpm db:migrate        # Run migrations
pnpm db:seed           # Seed test data
```

## Production deployment
See `DEPLOYMENT.md` for production deployment steps.
