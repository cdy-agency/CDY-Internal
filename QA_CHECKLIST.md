# CDY Finance Module — QA Checklist (Sprint 5 Sign-off)

## Happy path
- [ ] Login as finance@cdy.com → redirected to /finance
- [ ] Create draft invoice CDY-2026-TEST-001 with 3 line items
- [ ] Totals calculate correctly (subtotal + tax = total)
- [ ] Send invoice → PDF emailed to test inbox
- [ ] Record full payment → receipt emailed → status = PAID
- [ ] P&L report reflects the paid invoice in revenue
- [ ] CEO dashboard shows updated Collected metric within 60 seconds

## Overdue path
- [ ] Create and send invoice with due date = yesterday
- [ ] Run overdue cron manually: POST /api/v1/debug/run-cron/overdue
- [ ] Invoice status = OVERDUE
- [ ] Notification appears in Finance Manager's bell
- [ ] Ageing report shows invoice in correct bucket

## Partial payment path
- [ ] Record $2,000 on a $5,000 invoice → status = PARTIALLY_PAID
- [ ] Remaining balance shows $3,000 on invoice detail
- [ ] Record $3,000 → status = PAID → receipt fires

## Write-off path
- [ ] Write off an overdue invoice with reason "Client insolvent"
- [ ] Invoice removed from AR balance
- [ ] P&L shows bad debt expense for the period

## Commission path
- [ ] POST /commissions/calculate with test deal data
- [ ] Commission record created with PENDING status
- [ ] Finance manager approves with adjusted amount
- [ ] Adjusted amount appears in payroll summary

## Cash flow path
- [ ] Open /finance/reports/cashflow
- [ ] Add a manual adjustment (OUT, $5,000, next week)
- [ ] Chart re-renders with adjustment reflected
- [ ] Shortfall banner appears if balance goes negative

## Role enforcement
- [ ] ceo@cdy.com can GET /invoices (200)
- [ ] ceo@cdy.com cannot POST /invoices (403)
- [ ] sales@cdy.com cannot GET /invoices (403)
- [ ] sales@cdy.com can GET /commissions/my (200)
- [ ] Team member JWT cannot access any /finance route (403)

## Notifications
- [ ] Finance manager receives notification after invoice goes overdue
- [ ] Bell badge shows correct unread count
- [ ] Clicking notification navigates to correct record
- [ ] Mark all read clears the badge

## Performance
- [ ] Invoice list (500 records) loads in under 2 seconds
- [ ] P&L report loads in under 1 second
- [ ] Cash flow forecast (13 weeks) loads in under 1.5 seconds
- [ ] Balance sheet loads in under 1 second

## Audit log
- [ ] Creating an invoice generates an audit entry
- [ ] Sending an invoice generates an audit entry
- [ ] Recording a payment generates an audit entry
- [ ] Audit log page shows entries in correct order
- [ ] No delete endpoint exists — verify 405 is returned

## Payroll path (Sprint 8)
- [ ] Add salary records for 3 employees
- [ ] Add commission rule for sales agent
- [ ] Close a test deal via POST /commissions/calculate
- [ ] Approve commission via commission review page
- [ ] Create payroll run for current month
- [ ] Verify commission appears in agent's line item
- [ ] Adjust one employee's line item (as a different user)
- [ ] Verify self-adjust block — cannot adjust own line item
- [ ] Process payroll as a different user (separation of duties)
- [ ] Verify self-process block — creator cannot process own run
- [ ] All payslips sent — verify payslip email received
- [ ] Lock payroll run — verify LOCKED status prevents any further edits

## Commission rules path (Sprint 8)
- [ ] Create commission rule via rules page
- [ ] Create deal and verify correct rate applied
- [ ] Deactivate rule — new deals no longer use it
- [ ] Old commission records referencing the rule are unaffected

## Balance sheet hardening path (Sprint 8)
- [ ] Add manual asset entry "Cash in bank: $50,000"
- [ ] Add manual liability "Bank loan: $20,000"
- [ ] Balance sheet reflects new entries in totals
- [ ] Equity = total assets − total liabilities (verify manually)
- [ ] Year-on-year comparison shows correct previous year figures

## Settings path (Sprint 8)
- [ ] Update company name in General settings
- [ ] Create a new invoice — PDF shows updated company name
- [ ] Update invoice footer note — PDF shows new note
- [ ] Tax Rates tab shows same content as /finance/settings/tax

## Production smoke test
- [ ] Login on production URL
- [ ] Create draft invoice
- [ ] Send invoice (Resend delivers to real inbox)
- [ ] View P&L report — no errors
- [ ] Sentry receives a test event

---

# CDY Projects Module — QA Checklist (Sprint 17 Sign-off)

## Project lifecycle
- [ ] Create project → CDY-PRJ-NNN generated atomically
- [ ] PM auto-added as MANAGER member on creation
- [ ] Finance budget record created when estimatedBudget provided
- [ ] TEAM_MEMBER sees only their assigned projects
- [ ] Complete project with incomplete tasks — warning shown, acknowledge required
- [ ] Complete project with uninvoiced milestones — warning shown, acknowledge required
- [ ] CEO and Finance Manager notified on project completion
- [ ] Handover report only generated for COMPLETED projects (400 otherwise)

## Tasks
- [ ] Create task → assignee notified
- [ ] Sub-task creation blocked if parent is itself a sub-task
- [ ] Move task to BLOCKED → PM notified immediately
- [ ] Move task to DONE → completedAt set
- [ ] Import tasks from CSV → correct task count with error list

## Milestones
- [ ] Milestone approve → Finance draft invoice created
- [ ] Invoice linked back to milestone (invoiceId populated)
- [ ] Finance Manager receives notification with invoice link
- [ ] Milestone status → INVOICED after invoice created
- [ ] Finance failure does not block milestone approval

## Approvals
- [ ] Request approval → PM notified
- [ ] Approve decision → assignee notified, task auto-completes if requiresApproval
- [ ] Reject without note → 400
- [ ] Reject with note → assignee notified with client feedback

## Time tracking
- [ ] Log 0 hours → 400
- [ ] Log > 24 hours → 400
- [ ] Labour cost calculation: hours × hourly rate correct
- [ ] Fallback rate calculated from salary correctly
- [ ] Profitability gross margin = (revenue - labour - expenses) / revenue

## Profitability
- [ ] Revenue pulls from Finance invoices linked via milestone
- [ ] Labour cost sums billable hours × rates across all employees
- [ ] Direct expenses pull from Finance expenses with matching projectId
- [ ] Gross margin colour: green ≥ 40%, amber 20-39%, red < 20%

## Reports
- [ ] Portfolio report counts correct by status
- [ ] Budget vs actual variance calculated correctly
- [ ] Over-budget project shown in red
- [ ] Portfolio report cached — second call returns cached result

## Cron
- [ ] Deadline cron notifies assignees 48h before due date
- [ ] Deadline cron sends ONE summary per PM for overdue tasks (not one per task)

## Permissions
- [ ] TEAM_MEMBER cannot create projects (403)
- [ ] TEAM_MEMBER cannot access /projects/reports (middleware blocks)
- [ ] Finance Manager can read projects but cannot update tasks (403)
- [ ] CEO cannot create or edit projects (403)
