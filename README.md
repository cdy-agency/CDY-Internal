# CDY In-House Operating System

The CDY In-House Operating System is a purpose-built business management platform for CDY — a multi-service agency operating across Africa. It replaces spreadsheets, email threads, WhatsApp groups, and disconnected tools with a single integrated system covering every aspect of the business.

---

## What the system does

CDY operates across seven service lines. The platform manages the entire business lifecycle for each one — from a lead entering the sales pipeline through to the client being invoiced, the team delivering the work, staff being paid, and the CEO seeing it all on one screen.

---

## Modules

### Finance

The financial backbone of the entire system. Every money movement in CDY — money in, money out, staff costs, commissions, retainer billing — flows through Finance.

**Invoices** are created manually or automatically triggered by other modules. Each invoice gets a unique number in the format CDY-YYYY-NNNN. A branded PDF is generated and emailed to the client. Invoices move through Draft → Sent → Partially Paid → Paid → Overdue. Once sent, an invoice cannot be edited — this protects the audit trail. Overdue detection runs automatically every morning at 8am.

**Payments** are recorded against invoices. Partial payments are supported. When an invoice is fully paid, a receipt PDF is generated and emailed to the client automatically. Payments are atomic — the balance update and payment record happen in a single database transaction.

**Expenses** capture money going out of CDY. Each expense has a vendor, category, amount, date, and optional receipt upload. Expenses within 24 hours can be edited — after that they are locked. Expenses can be tagged to a venture with a share percentage for shared costs.

**Bills** are obligations CDY owes to suppliers — the money has not left yet. Due date alerts fire 3 days before a bill is due. Bills feed into the cash flow forecast as upcoming outflows.

**Accounts Receivable** shows every client's outstanding balance. Clients are classified by risk level — Current, Low Risk, Medium Risk, High Risk — based on days overdue. A three-stage reminder cascade fires automatically: day 0, day 3, and day 7 overdue. The day 7 reminder copies the account manager. Reminders stop the moment a payment is recorded.

**Bank Reconciliation** imports CSV statements from any bank or mobile money provider (MTN MoMo, Equity, GT Bank, etc.). The system auto-matches transactions to payment records within a 2-day tolerance. Unmatched items are flagged for manual resolution. The reconciliation is only marked complete when the closing balance matches the system balance.

**Credit Notes** handle refunds and adjustments. Always linked to the original invoice. Raising a credit note against a paid invoice automatically creates a bill for the refund amount.

**Payment Plans** allow a client's invoice to be paid in instalments. Each instalment has a due date. Overdue instalment alerts fire automatically.

**Tax Management** applies tax rates automatically based on the client's country and the service type. Tax liability reports show what CDY owes each revenue authority, and tax remittances are recorded when paid.

**Retainers** are monthly recurring contracts. Once configured, they bill automatically every morning at 7am — the invoice is created, the PDF generated, and the email sent with zero human input. The Finance Manager receives a notification. Retainers can be paused, resumed, amended, or ended. MRR and ARR dashboards show the predictable revenue base. Client selection uses an autocomplete search — not a raw ID field.

**Commissions** are calculated automatically when a CRM deal closes. The rate is looked up from a commission rules table (agent + service type → rate). The Finance Manager reviews, optionally adjusts with a reason, and approves or rejects. Approved commissions feed into the next payroll run. When a commission is approved, a Finance expense record is automatically created so it appears in the P&L under the COMMISSION category.

**Payroll** runs monthly. The engine pulls base salaries from HR Employee records and approved commissions. The Finance Manager reviews line items before processing. Separation of duties is enforced — the person who creates the run cannot process it. An employee cannot adjust their own payroll line. Processing generates and emails payslips. When payroll is processed, Finance expense records are automatically created — one for total salaries and one for total commissions — so they appear in the P&L under Staff Costs.

**Budget Tracking** sets a total approved budget per project. An alert fires when costs hit 80% of budget. Expense logging is blocked when over budget. The PM submits a budget increase request; the Operations Manager approves or rejects.

**Ventures** are CDY's affiliated small businesses. Ventures are a tag on Finance records — income is tracked as Finance invoices tagged with a ventureId, expenses are Finance expenses tagged with a ventureId and an optional share percentage for shared costs. The ventures dashboard is a filtered view of Finance data. All venture money flows through Finance tables.

**Reports:**
- Profit and Loss — revenue by service type, staff costs (salaries + commissions broken out separately), operating expenses, net profit. Filterable by period and venture.
- Invoice Ageing — outstanding invoices bucketed by days overdue.
- Expense Summary — monthly spending by category with bar chart.
- Cash Flow Forecast — 90-day week-by-week projection including retainer inflows and bill outflows.
- Balance Sheet — assets, liabilities, equity at any selected date.
- Tax Liability — tax collected vs remitted by revenue authority.

**Automation schedule:**

| Time | Job |
|---|---|
| 7:00am | Retainer billing — invoices generated and sent |
| 7:30am | Project deadline alerts |
| 8:00am | Overdue invoice detection |
| 8:05am | Payment reminder cascade |
| 8:10am | Bill due date alerts |
| 8:15am | Payment plan instalment alerts |
| 8:20am | Project budget consumption alerts |
| 8:30am | CRM proposal expiry check |
| 9:00am | CRM follow-up reminders |

---

### IT / RBAC

Controls who can access what across the entire system.

The system has exactly 8 fixed roles. No new roles can be created. The IT Administrator toggles individual feature permissions per role through a visual permission matrix.

| Role | Home module | Primary access |
|---|---|---|
| CEO | /ceo | Read everything + CEO dashboard |
| Finance Manager | /finance | Full Finance access |
| Operations Manager | /projects | Full access to all operational modules |
| Project Manager | /projects | Projects, service delivery |
| Sales Agent | /crm | CRM pipeline, own commissions |
| Team Member | /hr/leave/my | Own tasks, attendance, leave |
| Client | /finance/invoices | Own invoices only |
| IT Administrator | /it | User and permission management only |

Every system feature has independent READ and WRITE permissions. Permission changes take effect within 5 minutes for active sessions.

The CEO role always has full access to every feature — this cannot be changed by the IT Administrator.

Permissions are seeded once and never overwritten by subsequent seed runs. Existing permissions are always preserved.

After login, users are redirected to their role's home module automatically.

---

### CRM

Manages the full sales lifecycle from first lead to closed deal.

**Leads** are created by sales agents. A quality score (0–100) is calculated from source quality, deal value, contact completeness, and engagement activity. Leads with 70+ are Hot (red), 40–69 Warm (amber), below 40 Cold (gray).

**Pipeline** is a 6-stage kanban board: New → Contacted → Proposal Sent → Negotiation → Closed Won → Closed Lost. Drag and drop moves leads between stages. Closed Lost requires a reason.

**When a deal closes (Closed Won):**
1. A CRM Client record is created automatically
2. Commission is calculated and a PENDING record created in Finance
3. A DRAFT invoice is created in Finance for the estimated deal value
4. Finance Manager and Sales Agent are both notified

This entire flow runs in the background — a Finance failure never blocks the CRM stage move.

**Clients** can be registered in two ways: automatically when a deal closes, or directly for clients who reach CDY without going through the pipeline. Direct registration captures source type — Direct, Referral, or Returning.

**Proposals** are tracked (PDFs prepared externally). Proposal status moves Draft → Sent → Accepted → Rejected. Accepted proposals auto-move the lead to Negotiation.

**Sales Targets** set monthly revenue and deal targets per agent. Agent dashboard shows progress gauges.

**Reports:** Conversion funnel, sales performance per agent (ranked leaderboard), source analysis.

---

### HR

Manages CDY's people from hire to exit.

**Employees** have profiles with job title, department, manager, salary, bank details, and emergency contact. Each gets an auto-generated code CDY-EMP-NNN. The HR Employee record is the source of truth for the Finance payroll engine.

**Leave Management** supports configurable leave types. Each employee gets a balance per type per year. Submitting a request checks balance sufficiency and overlap with approved requests. Approval, rejection (reason required), and cancellation are all tracked. Balance recalculates automatically after every status change.

**Attendance** tracks daily check-in and check-out. Less than 4 hours = Half Day. One record per employee per day enforced at the database level.

**Performance Reviews** follow a 5-stage cycle: Draft → Self Assessment → Manager Review → Acknowledged → Completed. Cannot skip stages. Each stage notifies the relevant party.

**Salary History** records every salary change. The payroll engine uses this to apply mid-period salary changes correctly.

**Onboarding Checklist** auto-creates when a new employee record is created. 12 default items across 4 categories with due dates calculated from start date.

**HR Reports:** Headcount, turnover rate, leave utilisation, attendance summary.

---

### Projects

Manages client delivery engagements.

**Project cost model:** When a project is created, the PM enters the total agreed price. The system immediately creates a DRAFT invoice in Finance for that amount. The Finance Manager reviews and sends it.

**Milestones** are progress markers only — no billing. A milestone can only be marked Complete when all its tasks are Done.

**Tasks** have a status moving through: To Do → In Progress → Blocked → In Review → Done. Moving to Blocked immediately notifies the Project Manager. Sub-tasks supported one level deep.

**Client Approvals** handle deliverable sign-off. When a task requires approval, the PM attaches a file link. The client approves (task auto-moves to Done) or requests changes (assignee notified with feedback).

**Team Workload** shows every team member with their open task count, overdue count, and load classification — High, Medium, or Normal.

**Status Report** generates a structured plain-text progress summary. Copy-to-clipboard for pasting into a client email.

**Handover Report** generates when a project is completed. Client-safe — no internal cost data. Saved as a permanent snapshot.

---

### Marketing Services

Manages content delivery for social media and digital marketing clients.

Marketing clients are linked via a Finance retainer — the user searches for an active retainer, and the client is automatically derived from the retainer. Billing is handled entirely through the Finance retainer system.

**Content Calendar** shows a monthly grid with content items per day as coloured status pills.

**Content Status Flow:** Draft → Ready → Approved → Published. Enforced server-side. Published is terminal.

**Monthly Summary** shows delivery rate (published vs target) by platform, with a link to the Finance retainer invoice for that month.

---

### Software and Web Dev Services

Manages the full software development lifecycle with enforced phase gates.

**Phase flow:** Requirements → Design → Development → QA → Deployment → Maintenance → Completed

**Phase gates enforced server-side:**
- Requirements phase: at least one requirements document must be signed before advancing
- Development phase: no active sprint can exist when advancing to QA
- QA phase: no CRITICAL bugs can be open before advancing to Deployment

**Design** is optional — can be skipped entirely.
**QA** is optional — can be skipped entirely.
**Development** uses agile sprints — only one sprint Active at a time.
**Deployment** records go-live date, URL, and server details. Auto-starts 1-year maintenance period.
**Maintenance** logs post-deployment issues by type (Bug, Update, Security) with priority and resolution.

**Finance link:** Creating a software project with a total cost automatically creates a DRAFT invoice in Finance.

---

### Branding Services

Manages branding delivery with flexible per-client scope.

Each project has a free-form scope — whatever deliverables the client needs. For each scope item: designer submits a design, client approves or rejects with feedback, new versions submitted until approved. Suppliers optionally attached to outsourced items.

Marking a project as Delivered notifies Finance Manager. Creating a branding project with a total cost automatically creates a DRAFT invoice in Finance.

---

### Influencer Marketing

Manages influencer campaigns from brief to payment.

**Influencer Database** maintained by CDY. Each influencer has handle, platform, followers, category, and full campaign history.

**Campaigns** are created for a client with a brief, platforms, and total fee. Creating a campaign with a total cost automatically creates a DRAFT invoice in Finance.

**Deliverables** define what each influencer must post. Status moves Pending → Submitted → Verified (or Missed). Verification is manual — a team member confirms the content was posted.

**Payments** are logged per influencer. When marked paid, a Finance expense record is automatically created with category INFLUENCER_PAYMENT, so it appears in the P&L.

---

### Sales Services

Manages CDY's outsourced field sales operations.

**Campaigns** deploy CDY's HR employees as a field sales team for a client. Creating a campaign with a total fee automatically creates a DRAFT invoice in Finance.

**Agents** are deployed from the HR employee roster with optional individual territories and targets.

**Daily Activity Logging** — each agent logs visits, leads, sales, and field notes daily. One log per agent per day. Logs older than 7 days cannot be edited.

**Weekly Reports** are generated from daily logs. The manager adds highlights, challenges, and next week's plan. A "Copy for client" button produces clean plain-text — no internal CDY data — ready for email or WhatsApp.

---

### Tech Products

Records CDY's own software products and platforms.

**Product Registry** lists products with type (SaaS, Platform, Tool), status, version, and URL.

**Subscriptions** track subscribers with plan, billing cycle (Monthly/Annual/One-time), amount, and optional Finance retainer link. MRR calculated as monthly subscriptions plus annual subscriptions divided by 12.

**Support Tickets** logged when something is reported broken. Critical tickets notify Operations Manager immediately. Resolution requires resolution notes.

**Version Log** records every release. Logging a version updates the product's current version field.

---

### CEO Global Dashboard

One screen aggregating real-time data from every module. Auto-refreshes every 60 seconds.

**CEO Actions bar** — shown only when items need attention: commissions to approve, leave requests pending, budget increases to approve, overdue invoices, blocked tasks. Each is a direct link.

**Finance section** — revenue MTD with trend, cash collected, outstanding AR, MRR, 6-month revenue trend chart, invoice status donut chart.

**CRM section** — pipeline value, leads MTD, closed won, conversion rate, pipeline by stage bars, top 3 agents.

**HR section** — team size, present today, on leave, pending leave requests, attendance rate gauge.

**Projects section** — active projects, overdue tasks, blocked tasks, project progress bars.

**Service lines** — one tile per service module with the key count and a link.

**Ventures** — total income, expenses, net profit for the current month with per-venture breakdown.

---

## User roles and access

| Role | What they can do |
|---|---|
| CEO | Read everything. Full CEO dashboard. Can approve commissions, leave, and budgets. |
| Finance Manager | Full Finance module. Read CRM clients, HR payroll data, project summaries for billing. |
| Operations Manager | Full access to HR, Projects, and all service delivery modules. Read Finance reports. |
| Project Manager | Full Projects module. Service delivery modules. Read HR employees. |
| Sales Agent | Full CRM pipeline. Own commissions. Own sales activity logging. |
| Team Member | Own leave and attendance. Assigned tasks and deliverables. Own daily activity log. |
| Client | Own invoices only. |
| IT Administrator | User management, role management, permission matrix. No operational module access. |

---

## Key design principles

**Finance is the source of truth for all money.** Every invoice, expense, payment, and commission flows through Finance regardless of which module initiated it.

**Every service that generates revenue creates a draft invoice automatically.** Projects, software projects, branding projects, influencer campaigns, and sales campaigns all create draft invoices when created with a cost. The Finance Manager always reviews before sending.

**Background triggers never block the main action.** All Finance integrations run via setImmediate. If Finance fails, the triggering action still succeeds.

**Permissions are enforced on both frontend and backend.** The UI hides buttons the user cannot use. The API returns 403 for unauthorised requests.

**Payroll expense records connect Finance to staff costs.** When payroll is processed, expense records are created automatically for salaries and commissions, making staff costs visible in the P&L, cash flow forecast, and expense reports.

---

## Audit trails

Every significant action is permanently logged:

- Finance Audit Log — every financial record change with before/after values, user, timestamp, IP
- CRM Audit Log — every lead and proposal status change
- HR Audit Log — salary changes, review completions, employee status changes
- IT Audit Log — every permission change and user management action
- Cron Log — every automated job execution with items processed and error count

Audit logs are read-only. No endpoint exists to modify or delete entries.