# Timesheet Management System — Overview

> **Project:** cnma_timesheet | **Prepared by:** Nguyen Manh Cuong | **Date:** February 07, 2026 | **Version:** 01 | **Target Launch:** March 01, 2026

---

## 1. Project Metadata

| Field | Value |
|-------|-------|
| Project Name | cnma_timesheet |
| Prepared By | Nguyen Manh Cuong |
| Date | February 07, 2026 |
| Version | 01 |
| Target Launch | March 01, 2026 |
| Tech Stack | React / SAP CAP / SAP HANA / SAP BTP |

---

## 2. Project Objectives

| Field | Details |
|-------|---------|
| **Main Goal** | Replace the manual Excel-based timesheet process with an automated web application that allows staff to log time, team leads to approve, and aTrung (Admin) to export formatted Excel reports to the German team. |
| **Expected Benefits** | Eliminate manual data consolidation; reduce errors in timesheet data; save 2–4 hours/week for aTrung; provide real-time visibility into team utilization and project hours. |
| **Success Metrics** | 100% of staff submitting via system within 1 month of launch; export time reduced from hours to minutes; zero manual re-formatting needed for German report. |

---

## 3. Current Process & Pain Points

### Current Workflow (5-step manual chain)
```
Excel logging → Papierkram entry → Send to aTrung → aTrung re-formats → Send to Germany
```

| Step | Actor | Notes |
|------|-------|-------|
| Log in Excel | Staff & Freelancers | Daily task |
| Log to Papierkram | Staff & Freelancers | Duplicate entry |
| Send to aTrung | Staff & Freelancers | Manual email / file sharing |
| Re-format & consolidate | aTrung | **Bottleneck** — manual, error-prone |
| Send to Germany | aTrung | Critical client-facing output |

### Current Excel Template Columns
`Date` | `Type` | `Task / Description` | `Working Location` | `Hours` | `Project (Papierkram)` | `Note (Internal Projects)`

---

## 4. User Roles & Permissions

| Role | Description |
|------|-------------|
| **Staff (Full-time)** | Regular employee who logs their own daily timesheet entries |
| **Team Lead** | Supervisor who reviews and approves timesheets for their direct reports |
| **aTrung (Admin)** | System administrator — consolidates approved timesheets and exports to Germany |

### Permissions Matrix

| Feature / Action | Staff | Team Lead | Admin |
|-----------------|-------|-----------|-------|
| Log own timesheet | ✓ | ✓ | ✓ |
| View own timesheet | ✓ | ✓ | ✓ |
| Edit own timesheet (before approval) | ✓ | ✓ | ✓ |
| Edit own timesheet (after approval) | ✗ | ✗ | ✓ (override) |
| View team members' timesheets | ✗ | ✓ (own team) | ✓ (all) |
| Approve timesheets | ✗ | ✓ | ✓ |
| Reject timesheets | ✗ | ✓ | ✓ |
| Bulk approve / reject | ✗ | ✓ | ✓ |
| Export reports to Excel | ✗ | partial | ✓ |
| Send email to Germany | ✗ | ✗ | ✓ |
| Manage projects (sync Papierkram) | ✗ | ✗ | ✓ |
| Manage users & assign roles | ✗ | ✗ | ✓ |
| View audit logs | ✗ | ✗ | ✓ |

---

## 5. Approval Workflow

```
DRAFT → SUBMITTED → APPROVED_BY_TEAMLEAD → APPROVED → FINISHED
                 ↘  REJECTED (→ Staff edits & resubmits)
```

| Status | Actor | Description |
|--------|-------|-------------|
| **Draft** | Staff | Creating / editing entry. Can edit or delete freely. |
| **Submitted** | Staff | Submitted for review. Locked from editing. |
| **Approved** | Team Lead | Approved by Team Lead. aTrung can view, edit, and export. |
| **Rejected** | Team Lead | Rejected with reason. Staff must edit and re-submit. |
| **Locked / Finished** | Admin | Export completed. Fully finalised and archived. |

---

## 6. Timesheet Logging Requirements

### Required Fields per Entry
| Field | Priority |
|-------|----------|
| Date (exclude weekends) | **H** |
| Project (dropdown from API) | **H** |
| Type: Papierkram / Internal / Others | **H** |
| Task Description | **H** |
| Hours | **H** |
| Working Location | **H** |
| Note | M |

### Key Rules
- Multiple entries per day are allowed
- Future and past dates are permitted (no restriction in v1)
- No task status tracking required (flat task structure)
- `> 8h/day` automatically counts as OT (calculated separately)

---

## 7. Export & Integration

### Excel Export (Germany Format)
- **Filename convention:** `YYYY_MM_Timesheet_FirstName_LastName.xlsx`
- **Columns:** Date, User, Project, Type, Task, Hours, Location, Note
- **Pivot table:** Total hours by Project & User
- **Library:** `exceljs` (server-side)

### Papierkram Integration
- **API:** [https://api-doc.papierkram.de/api/v1/api-docs/index.html](https://api-doc.papierkram.de/api/v1/api-docs/index.html)
- **Auth:** API Token (HTTP Bearer)
- **Sync:** Daily cron + manual trigger button

### Other Integrations
| Integration | Status | Purpose |
|-------------|--------|---------|
| Email (SMTP / nodemailer) | TBD | Notify on submit/approve/reject, send Excel |
| MISA (accounting) | **Y — Confirmed** | Accounting system integration |
| Bulk Excel Import | **Y — Confirmed** | Staff imports from Excel template |
| Papierkram API | **Y — Confirmed** | Project list sync |

---

## 8. Reports & Analytics

### Required Reports
| Report | Priority |
|--------|----------|
| Overtime Report | **H** |
| Project Utilization Report | **H** |
| Billable vs Non-Billable | **H** |
| Compliance Report (late submissions) | **H** |
| Individual Summary | **H** |
| Productivity Report | M |
| Cost Report | M |
| Team Capacity Report | M |

---

## 9. Confirmed Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| State Management | Zustand |
| UI Library | Tailwind CSS + shadcn/ui |
| Form Handling | React Hook Form + Zod |
| Backend | SAP CAP + Node.js + TypeScript |
| Database (dev) | SQLite |
| Database (prod) | SAP HANA |
| Cloud Platform | SAP BTP + Azure / Cloud Foundry |
| Authentication | SAP BTP OAuth |
| CI/CD | Jenkins + Azure DevOps |
| Excel Export | `exceljs` (server-side) |
| Excel Import | `SheetJS / XLSX` (client-side) |

---

## 10. Success Criteria & KPIs

### Time Savings Targets
| Metric | Target |
|--------|--------|
| Time to log timesheet per week (per person) | < 15 min/week |
| Time to process / export timesheet (aTrung) | < 30 min/month |
| Time to generate reports | < 5 min |
| Number of manual steps | ≤ 2 steps |

### Accuracy & Compliance
| Metric | Target |
|--------|--------|
| Error rate in timesheet data | < 2% |
| % of timesheets submitted on time | > 95% |
| % approved on first submission | > 90% |

### User Adoption
| Metric | Target |
|--------|--------|
| User satisfaction score | ≥ 4 / 5 |
| % of users active after 3 months | > 95% |
| Support tickets per month | < 5 |

---

## 11. Nice-to-Have (Post-Launch Roadmap)

| Feature | Interest |
|---------|----------|
| Copy Timesheet (from previous day/week) | **H** |
| Auto-suggestion (based on history) | **H** |
| Invoice Generation from billable hours | **H** |
| Calendar View (drag-and-drop) | M |
| Team Calendar | M |
| AI Task Description Suggestions | M |
| Resource Forecasting | M |
| Calendar Integration (Google / Outlook) | M |
| Voice Input | L |
| Gamification (badges for timely submission) | L |

---

## 12. Top Priority Questions (Pre-Development)

| Question | Status |
|----------|--------|
| Number of users (Staff + Freelancer + Manager) | TBD |
| aTrung's Excel export format | → See Template sheet in source xlsx |
| Top 3–5 must-have features for launch | TBD — to be prioritised |
