# CDY CRM Module — QA Checklist

## Lead lifecycle

- [ ] Create lead — quality score calculated correctly
- [ ] Move lead through all 6 stages in sequence
- [ ] Move to CLOSED_LOST without reason → 400 error
- [ ] Move to CLOSED_WON → Client created, commission triggered, draft invoice created
- [ ] Finance Manager receives notification after CLOSED_WON
- [ ] Sales Agent receives notification after CLOSED_WON
- [ ] Draft invoice visible at /finance/invoices with correct client name
- [ ] Commission record visible at /finance/commissions

## Pipeline board

- [ ] Kanban board shows all 4 active columns with correct lead counts
- [ ] Drag lead to different column → stage updates in database
- [ ] Drop into Closed Won zone → confirmation modal appears
- [ ] Confirmation modal shows Finance trigger warning
- [ ] Quality score badge colours correct: red (hot), amber (warm), gray (cold)

## Proposals

- [ ] Create proposal linked to lead
- [ ] Mark as Sent → lead auto-moves to PROPOSAL_SENT
- [ ] Mark as Accepted → lead auto-moves to NEGOTIATION, agent notified
- [ ] Mark as Rejected → agent notified with reason, 400 if no reason
- [ ] Proposal with past expiresAt → marked EXPIRED by cron

## Agent dashboard

- [ ] Sales Agent sees own dashboard (not team view) on /crm
- [ ] Revenue progress bar shows correct % vs target
- [ ] Commission breakdown shows correct amounts and statuses
- [ ] Overdue follow-ups section shows correct leads

## Team view

- [ ] CEO sees leaderboard with all agents
- [ ] Set Targets modal saves correctly
- [ ] Target progress colours: green ≥80%, amber 50-79%, red <50%

## Bulk actions

- [ ] Select 3 leads → bulk action bar appears
- [ ] Bulk assign to agent → all 3 leads updated
- [ ] Bulk move stage → all 3 leads moved
- [ ] Cannot bulk assign closed leads (checkbox disabled)
- [ ] Bulk delete requires confirmation

## Filters and export

- [ ] Advanced filter panel filters leads correctly across all fields
- [ ] Save filter → appears as pill, applies on click
- [ ] Export CSV downloads file with correct columns
- [ ] Export respects current filter state

## Reports

- [ ] Conversion funnel widths proportional to stage counts
- [ ] Sales performance report shows all agents with correct figures
- [ ] Source analysis conversion rates calculated correctly
- [ ] All report figures verified against known test data

## Settings

- [ ] Add lost reason → appears in Closed Lost modal
- [ ] Remove lost reason → no longer shown
- [ ] Score weights must sum to 100 — Save disabled otherwise
- [ ] Currency setting saves and persists after page reload

## Permissions

- [ ] SALES_AGENT cannot access /crm/reports — redirected
- [ ] SALES_AGENT can only see own leads in list and pipeline
- [ ] CEO cannot POST /crm/leads — 403
- [ ] TEAM_MEMBER cannot access any /crm route — 403
- [ ] Finance invoice drawer shows client autocomplete with real names
