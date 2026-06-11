# Finance Module RBAC Matrix

| Endpoint | CEO | FM | SM | PM | OM | TM | CLIENT |
|---|---|---|---|---|---|---|---|
| GET /invoices | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| POST /invoices | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PATCH /invoices/:id | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| POST /invoices/:id/send | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| DELETE /invoices/:id | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| POST /invoices/:id/payments | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /payments | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /expenses | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| POST /expenses | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /bills | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /reports/pl | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /reports/ageing | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /reports/cashflow | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /reports/balance-sheet | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /commissions | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /commissions/my | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| PATCH /commissions/:id/review | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /audit | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /audit/:entityId | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

FM = FINANCE_MANAGER, SM = SALES_AGENT, PM = PROJECT_MANAGER, OM = OPERATIONS_MANAGER, TM = TEAM_MEMBER
