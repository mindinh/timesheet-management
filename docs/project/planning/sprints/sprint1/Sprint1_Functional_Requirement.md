# Sprint 1 — Functional Requirements

> **Sprint 1** | Feb 13 – Feb 20, 2026 | **Source:** Sprint1_Functional_Requirement.docx

---

## Workflow Overview

Sprint 1 implements the core approval flow with 3 roles:

```
Staff (logs) → Team Lead (approves/rejects) → Admin/aTrung (edits & exports)
```

### Approval Status Flow

| Status | Color | Actor | Description |
|--------|-------|-------|-------------|
| **DRAFT** | ⚫ Gray | Staff | Staff creates / edits entry |
| **SUBMITTED** | 🟡 Yellow | Staff | Staff submits to Team Lead |
| **APPROVED** | 🟢 Green | Team Lead | Team Lead approves |
| **REJECTED** | 🔴 Red | Team Lead | Team Lead rejects with reason → Staff edits & resubmits |
| **Admin Review** | 🔵 Blue | Admin | aTrung reviews, edits if needed, exports Excel |

---

## Role 1: Staff

> Employee who enters and manages their own timesheets.

### 1.1 Timesheet Entry

| Feature | Description | Technical Requirements |
|---------|-------------|----------------------|
| **Create new timesheet** | Enter: Date, Project, Type (Papierkram/Internal/Others), Task description, Hours, Working location, Note | React form + Zod validation. Date picker (exclude weekends). Project dropdown from API. Type selector (radio). Hours: max 24h/day. |
| **Edit timesheet** | Edit entries with `status = DRAFT` only | `GET /timesheets/:id` → `PUT /timesheets/:id`. Guard: only allow edit when `status = DRAFT`. |
| **Delete timesheet** | Delete entries with `status = DRAFT` only | `DELETE /timesheets/:id`. Confirmation dialog. Guard: `status = DRAFT` only. |
| **View timesheet list** | Display list of own timesheets by day / week / month | `GET /timesheets?user_id=current`. Table with filter (date range, status). Pagination (100 items/page). |

### 1.2 Submit for Approval

| Feature | Description | Technical Requirements |
|---------|-------------|----------------------|
| **Submit timesheet** | Send DRAFT entries to Team Lead. Supports bulk submit (multiple entries at once). | `POST /timesheets/submit` — Body: `{ timesheet_ids: [id1, id2, ...] }`. Status: `DRAFT → SUBMITTED`. Notification to Team Lead. |
| **View status** | Check approval status: DRAFT / SUBMITTED / APPROVED / REJECTED | Color-coded status badges. |
| **Handle rejection** | View rejection reason and re-submit | Display `rejection_note`. Allow edit (status reset to DRAFT). Track submission history. |

---

## Role 2: Team Lead

> Supervisor who manages and approves timesheets for team members.

### 2.1 View & Approve Timesheets

| Feature | Description | Technical Requirements |
|---------|-------------|----------------------|
| **View pending list** | All timesheets with `status = SUBMITTED` from the team, grouped by user & date | `GET /timesheets?status=SUBMITTED&team_id=current`. Filters: user, date range, project. |
| **Review details** | Full entry information: user info, date, project, type, hours, task, location, note | `GET /timesheets/:id`. Modal / detail view panel. |
| **Approve timesheet** | Approve one or multiple entries | `POST /timesheets/approve` — Body: `{ timesheet_ids: [...] }`. Status: `SUBMITTED → APPROVED`. Notify Staff & aTrung. |
| **Reject timesheet** | Reject with specific reason | `POST /timesheets/reject` — Body: `{ timesheet_ids: [...], rejection_note: "..." }`. Status: `SUBMITTED → REJECTED`. Notify Staff. |
| **Bulk approve / reject** | Select multiple entries via checkbox and approve or reject at once | Checkbox multi-select. Buttons: `Approve Selected`, `Reject Selected`. Confirmation dialog. |

### 2.2 Team Management

| Feature | Description | Technical Requirements |
|---------|-------------|----------------------|
| **View team report** | Summarize working hours by user, project, and period | Dashboard charts: Total hours by user, Hours by project, Weekly/Monthly trends. Export to Excel. |
| **Approval history** | Track all approved/rejected timesheets | `GET /timesheets?status=APPROVED,REJECTED`. Table: status, user, date range, approval_date, approved_by. |

---

## Role 3: aTrung (Admin)

> Manages the entire system, processes approved timesheets, and exports Excel to send to Germany.

### 3.1 View & Manage Approved Timesheets

| Feature | Description | Technical Requirements |
|---------|-------------|----------------------|
| **View all approved** | Full list of timesheets approved by Team Lead | `GET /timesheets?status=APPROVED`. Table with full filters: User, Team Lead, Date range, Project, Type, Task description search. |
| **Overview dashboard** | Company-wide statistics: Total hours by team, Hours by project, Approved vs Pending ratio | Admin dashboard: Bar chart (hours by team), Pie chart (hours by project type), Line chart (monthly trends). Real-time updates. |
| **Edit approved timesheets** | Edit approved entries if adjustments needed before export to Germany. Track original + edit history. | `PUT /timesheets/:id` (admin override). Editable: hours, task description, note. Log: `edited_by`, `edited_at`, `original_value`. |

### 3.2 Excel Export for Germany

| Feature | Description | Technical Requirements |
|---------|-------------|----------------------|
| **Export Excel by template** | Export Excel per aTrung's format (with pivot table). Filter by: date range, team, project | `GET /timesheets/export?from=...&to=...`. `exceljs` library. Columns: Date, User, Project, Type, Task, Hours, Location, Note. Pivot table: Total hours by Project & User. Formatting: borders, colors, auto-width. |
| **Send email** | Send Excel file to German team's email with summary | `nodemailer` / SMTP. Attach Excel file. Email body: summary table (total hours, breakdown by project). CC: Team Lead and aTrung. |
| **Export history** | Store history of all exports, allow re-download | Table `export_logs`: `exported_by`, `export_date`, `from_date`, `to_date`, `total_entries`, `file_path`. |

### 3.3 System Administration

| Feature | Description | Technical Requirements |
|---------|-------------|----------------------|
| **Manage Users** | CRUD users, assign roles (Staff / Team Lead / Admin), deactivate/activate | `CRUD /users`. Roles: `STAFF`, `TEAM_LEAD`, `ADMIN`. Assign Team Lead to Staff. Soft-delete (`isActive` flag). |
| **Manage Projects** | Sync projects from Papierkram API. Activate/Deactivate projects | Papierkram API integration. Cron job: daily sync. Manual sync button. `POST /projects/sync`. |
| **View Audit Logs** | Who did what, when. Filter by user, action type, date range | Table `audit_logs`: `user_id`, `action`, `entity_type`, `entity_id`, `timestamp`, `details`. |

---

## Technical Summary

### Core API Endpoints

| Method | Endpoint | Description | Staff | Team Lead | Admin |
|--------|----------|-------------|-------|-----------|-------|
| `POST` | `/timesheets` | Create new timesheet entry | ✓ | — | — |
| `PUT` | `/timesheets/:id` | Update timesheet | ✓ (DRAFT) | — | ✓ (any) |
| `DELETE` | `/timesheets/:id` | Delete timesheet (DRAFT only) | ✓ | — | — |
| `GET` | `/timesheets` | List timesheets with filters | own | team | all |
| `GET` | `/timesheets/:id` | Timesheet detail view | own | team | all |
| `POST` | `/timesheets/submit` | Submit DRAFT to Team Lead | ✓ | — | — |
| `POST` | `/timesheets/approve` | Approve entries | — | ✓ | — |
| `POST` | `/timesheets/reject` | Reject with `rejection_note` | — | ✓ | — |
| `GET` | `/timesheets/export` | Export Excel | — | — | ✓ |
| `GET` | `/projects` | List active projects | ✓ | ✓ | ✓ |
| `POST` | `/projects/sync` | Sync from Papierkram API | — | — | ✓ |
| `GET` | `/users` | List users | — | team | ✓ |
| `POST` | `/users` | Create user | — | — | ✓ |
| `PUT` | `/users/:id` | Update user / assign role | — | — | ✓ |
| `GET` | `/audit-logs` | View audit logs | — | — | ✓ |
| `GET` | `/export-logs` | View export history | — | — | ✓ |

### Status Flow
```
DRAFT (Staff) → SUBMITTED (Staff) → APPROVED (Team Lead) → Admin processes & Exports
                                  ↘ REJECTED (Team Lead) → Staff edits & resubmits
```

### Database Entities
| Entity | Key Fields |
|--------|-----------|
| `User` | id, email, firstName, lastName, role, isActive, manager_id |
| `Project` | id, name, type, code, isActive, papierkram_id |
| `Task` | id, project_id, name, status |
| `Timesheet` | id, user_id, month, year, status, submitDate, approveDate |
| `TimesheetEntry` | id, timesheet_id, project_id, task_id, date, loggedHours, approvedHours, description |
| `ApprovalHistory` | id, timesheet_id, actor_id, action, fromStatus, toStatus, comment, timestamp |
| `AuditLog` | id, entity_, entityId, action, userId, changes |
| `ExportLog` | id, exported_by, export_date, from_date, to_date, total_entries, file_path |
