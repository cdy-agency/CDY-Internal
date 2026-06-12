# CDY HR Module — Complete Technical Reference

**Version:** 1.0.0  
**Released:** June 2026  
**Depends on:** Finance Module v2.0.0, IT/RBAC Module v1.0.0

## Database tables (12 total)

| Table | Description |
|---|---|
| Department | Organisational departments |
| Employee | Central HR record — links to User auth record |
| LeaveType | Configurable leave categories |
| LeaveBalance | Per-employee, per-type, per-year leave entitlement |
| LeaveRequest | Leave requests with approval workflow |
| AttendanceRecord | Daily check-in/check-out records |
| PerformanceReview | Quarterly performance reviews |
| SalaryHistory | Salary change audit trail |
| OnboardingChecklist | Structured new employee onboarding |
| OnboardingItem | Individual onboarding tasks |
| HrSetting | HR configuration key-value store |
| HrAuditLog | Tamper-proof HR action trail |

## API endpoints (Sprint 14 additions)

| Method | Path | Permission |
|---|---|---|
| POST | `/hr/performance` | hr.performance write |
| GET | `/hr/performance` | hr.performance read |
| GET | `/hr/performance/pending` | hr.performance read |
| GET | `/hr/performance/my` | authenticated |
| GET | `/hr/performance/:id` | employee/reviewer or hr.performance read |
| PATCH | `/hr/performance/:id/self-assessment` | own employee |
| PATCH | `/hr/performance/:id/complete` | hr.performance write |
| PATCH | `/hr/performance/:id/acknowledge` | own employee |
| GET | `/hr/employees/:id/performance` | hr.performance read |
| POST | `/hr/employees/:id/salary` | hr.payroll write |
| GET | `/hr/employees/:id/salary` | hr.payroll read |
| GET | `/hr/employees/:id/onboarding` | hr.employees read |
| PATCH | `/hr/employees/:id/onboarding/items/:itemId` | hr.employees write |
| GET | `/hr/reports/headcount` | hr.employees read |
| GET | `/hr/reports/turnover` | hr.employees read |
| GET | `/hr/reports/leave` | hr.attendance read |
| GET | `/hr/reports/attendance` | hr.attendance read |
| GET | `/hr/productivity` | hr.employees read (stub) |
| GET | `/hr/audit` | hr.settings read |

## Finance integration

The HR module is the source of truth for employee salaries.  
`PayrollService` reads `baseSalary` from Employee records.  
`SalaryHistory` is consulted to apply mid-period salary changes.

When a salary change is recorded with `effectiveFrom` within a payroll period, the new salary is used for that month's payroll.

`GET /finance/summary` includes:

- `totalActiveEmployees` — count of ACTIVE employees  
- `totalMonthlyPayroll` — sum of baseSalary for ACTIVE employees

## Leave calculation

- Working days calculated by excluding Sat/Sun  
- Leave balance = entitled + carryOver - used - pending  
- Balance recalculates after every request status change  
- Overlap detection prevents conflicting approved/pending requests

## Onboarding flow

Created automatically when a new Employee record is created.  
12 default items across 4 categories with auto-calculated due dates based on the employee's start date. Completable by HR Manager.

## Performance review flow

`DRAFT` → `SELF_ASSESSMENT` → `MANAGER_REVIEW` → `ACKNOWLEDGED` → `COMPLETED`

1. Manager creates review — employee notified to complete self-assessment  
2. Employee submits self-assessment — manager notified  
3. Manager completes review — employee notified to acknowledge  
4. Employee acknowledges — review marked COMPLETED

## HR audit log

Fire-and-forget logging via `HrAuditService.log()` for:

- employee.created, employee.updated, employee.terminated  
- salary.updated  
- leave.approved, leave.rejected  
- review.created, review.completed

## Frontend routes

| Route | Description |
|---|---|
| `/hr/performance` | Manager reviews list + team grid |
| `/hr/performance/my` | Employee review timeline |
| `/hr/performance/[id]` | Review detail (status-aware) |
| `/hr/reports` | Reports landing |
| `/hr/reports/headcount` | Headcount breakdown |
| `/hr/reports/turnover` | Turnover analysis |
| `/hr/reports/leave` | Leave utilisation |
| `/hr/reports/attendance` | Attendance summary |
| `/hr/audit` | HR audit log |

## Release tag

`v1.0.0-hr` — HR module production release (Day 60)
