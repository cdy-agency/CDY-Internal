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

## Production smoke test
- [ ] Login on production URL
- [ ] Create draft invoice
- [ ] Send invoice (Resend delivers to real inbox)
- [ ] View P&L report — no errors
- [ ] Sentry receives a test event
