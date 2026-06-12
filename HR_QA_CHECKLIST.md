# CDY HR Module — QA Checklist

## Employee management
- [x] Create employee → employee code CDY-EMP-NNN generated
- [x] Creating employee initialises leave balances for all leave types
- [x] Creating employee initialises onboarding checklist
- [x] TEAM_MEMBER can view employee directory (limited fields)
- [x] TEAM_MEMBER cannot see salary fields
- [x] Terminate employee → status = TERMINATED, endDate set

## Leave management
- [x] Submit leave with insufficient balance → 400 with clear message
- [x] Submit leave overlapping with existing approved request → 400
- [x] Submit unpaid leave (unlimited) → no balance check required
- [x] Manager approves leave → balance updates, employee notified
- [x] Manager rejects without reason → 400
- [x] Cancel own PENDING leave → status = CANCELLED, balance recalculates
- [x] Leave balance remaining = entitled + carryOver - used - pending (verify manually)
- [x] Team calendar shows approved leave correctly

## Attendance
- [x] Check in → record created
- [x] Second check-in same day → 400
- [x] Check out → working hours calculated
- [x] Check out with < 4 hours → HALF_DAY status
- [x] Manual entry by HR Manager → record created for past date

## Performance reviews
- [x] Create review → employee notified to complete self-assessment
- [x] Submit self-assessment → manager notified
- [x] Complete review without self-assessment → 400
- [x] Overall rating must be 1-5 — 0 or 6 returns 400
- [x] Employee acknowledges → status = COMPLETED
- [x] Cannot create duplicate review for same employee + period

## Salary management
- [x] Update salary → salary history record created
- [x] Payroll run uses updated salary if effectiveFrom ≤ payroll month
- [x] Salary tab only visible to HR Manager and Finance Manager

## Reports
- [x] Headcount report totals match actual employee count
- [x] Turnover rate calculated correctly
- [x] Leave utilisation rate = used / entitled for each type
- [x] Attendance summary groups correctly by employee

## Finance integration
- [x] Finance overview shows correct totalActiveEmployees
- [x] Finance overview shows correct totalMonthlyPayroll
- [x] Payroll run reads salaries from Employee table (not EmployeeSalary)

## Sprint 14 definition of done
- [x] All performance review endpoints with stage validation
- [x] HrAuditService wired into HR services
- [x] Onboarding auto-init on employee create
- [x] HR reports (headcount, turnover, leave, attendance)
- [x] Frontend pages: performance, reports, audit, profile tabs
- [x] HR sidebar updated
- [x] Next.js middleware updated
- [x] HR_MODULE.md complete
- [x] TypeScript compiles with zero errors
- [x] No any types
