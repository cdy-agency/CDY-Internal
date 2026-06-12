# CDY CRM Module — Complete Technical Reference

**Version:** 1.0.0  
**Released:** June 2026  
**Depends on:** Finance Module v2.0.0, IT/RBAC Module v1.0.0

---

## Overview

The CRM module manages the full sales lifecycle — from lead capture through pipeline management, proposal tracking, and deal closure. When a deal closes, it automatically:

1. Creates a Client record
2. Calculates commission in Finance
3. Creates a draft invoice in Finance
4. Notifies the Finance Manager

---

## Database tables

| Table | Description |
|---|---|
| Client | Converted client accounts |
| Lead | All leads in the pipeline |
| LeadActivity | Call, email, meeting, WhatsApp, note logs |
| Proposal | Proposal tracking records |
| PipelineStageHistory | Every stage transition logged |
| SalesTarget | Monthly targets per agent |
| SavedFilter | User-saved lead filter presets |
| CrmSetting | CRM configuration key-value store |
| CrmAuditLog | Tamper-proof CRM action trail |

---

## API reference

### Leads

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | /crm/leads | crm.leads WRITE | Create lead |
| GET | /crm/leads | crm.leads READ | List leads (agent-scoped) |
| GET | /crm/leads/:id | crm.leads READ | Lead detail |
| PATCH | /crm/leads/:id | crm.leads WRITE | Update lead |
| PATCH | /crm/leads/:id/stage | crm.leads WRITE | Move pipeline stage |
| DELETE | /crm/leads/:id | crm.leads WRITE | Soft delete lead |
| GET | /crm/leads/export | crm.leads READ | Export to CSV |
| POST | /crm/leads/bulk/assign | crm.leads WRITE | Bulk assign |
| POST | /crm/leads/bulk/move-stage | crm.leads WRITE | Bulk move stage |
| POST | /crm/leads/bulk/delete | crm.leads WRITE | Bulk soft delete |

### Pipeline

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /crm/pipeline | crm.pipeline READ | Kanban board data |
| GET | /crm/pipeline/conversion-report | crm.reports READ | Conversion funnel |

### Activities

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | /crm/leads/:leadId/activities | crm.leads WRITE | Log activity |
| GET | /crm/leads/:leadId/activities | crm.leads READ | Lead activity history |
| DELETE | /crm/leads/:leadId/activities/:id | crm.leads WRITE | Delete activity |

### Proposals

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | /crm/leads/:leadId/proposals | crm.proposals WRITE | Create proposal |
| GET | /crm/leads/:leadId/proposals | crm.proposals READ | Lead proposals |
| GET | /crm/proposals | crm.proposals READ | All proposals |
| PATCH | /crm/leads/:leadId/proposals/:id | crm.proposals WRITE | Update proposal |
| PATCH | /crm/leads/:leadId/proposals/:id/status | crm.proposals WRITE | Update status |

### Clients

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /crm/clients | crm.clients READ | All clients |
| GET | /crm/clients/search | crm.clients READ | Autocomplete search |
| GET | /crm/clients/:id | crm.clients READ | Client detail |
| PATCH | /crm/clients/:id | crm.clients WRITE | Update client |
| GET | /crm/clients/export | crm.clients READ | Export to CSV |

### Sales Targets

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /crm/targets/my | crm.leads READ | Own target |
| GET | /crm/targets/dashboard/me | crm.leads READ | Full agent dashboard |
| GET | /crm/targets | crm.reports READ | All agent targets |
| POST | /crm/targets | crm.reports WRITE | Set target |

### Reports

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /crm/reports/sales-performance | crm.reports READ | Agent performance |
| GET | /crm/reports/source-analysis | crm.reports READ | Lead source ROI |

### Settings and utilities

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /crm/settings | crm.leads READ | All CRM settings |
| PATCH | /crm/settings | crm.reports WRITE | Update setting |
| GET | /crm/settings/lost-reasons | crm.leads READ | Lost reason presets |
| GET | /crm/summary | crm.pipeline READ | Dashboard metrics |
| GET | /crm/filters | crm.leads READ | Saved filters |
| POST | /crm/filters | crm.leads READ | Save filter |
| DELETE | /crm/filters/:id | crm.leads READ | Delete saved filter |
| GET | /crm/audit | crm.reports READ | CRM audit log |

---

## Automation (cron jobs)

| Time | Job | Description |
|---|---|---|
| 8:30am | proposal-expiry-check | Marks expired proposals, notifies agents |
| 9:00am | crm-follow-up-reminders | Notifies agents of overdue follow-up actions |

---

## Deal closure flow

When a lead is moved to CLOSED_WON:

1. `Client` record created (or matched by email/company)
2. Lead `clientId` updated to link to the client
3. Commission calculated via `CommissionsService.calculate()`
4. Draft `Invoice` created in Finance with estimated deal value
5. Finance Manager notified via in-app notification
6. Sales Agent notified of deal close and commission pending

This entire flow runs in `setImmediate` — Finance failures never roll back the CRM stage move.

---

## Lead quality scoring

Scores are calculated on a 100-point scale:

| Factor | Max points | Criteria |
|---|---|---|
| Lead source | 30 | Referral/Returning=30, Partner=25, Website/Event=20, Social=15, Cold=10 |
| Deal value | 30 | $50k+=30, $20k+=25, $10k+=20, $5k+=15, $1k+=10, else=5 |
| Contact completeness | 20 | Phone=10, Email=10 |
| Engagement | 20 | 5+ activities=20, 3+=15, 1+=10, none=0 |

Score bands: Hot (70–100), Warm (40–69), Cold (0–39)

Score weights are configurable via CRM Settings.

---

## Known limitations

- Proposals are tracked but not generated as PDF in-system. The Finance team prepares proposal PDFs externally.
- Email integration for direct client communication is deferred to the Communications module.
- Lead auto-assign (round-robin) is configurable but the implementation is a future enhancement.
