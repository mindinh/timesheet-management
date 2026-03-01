# Backend API Reference

> **Last Updated:** 2026-02-28 | **Backend:** SAP CAP + Node.js + TypeScript

This document covers every API action and OData endpoint available in the backend.

---

## Base URLs

| Service | Base URL | Access |
|---------|----------|--------|
| `TimesheetService` | `http://localhost:4004/api/timesheet` | Any authenticated user |
| `AdminService` | `http://localhost:4004/api/admin` | `Admin` role only |

---

## TimesheetService

### OData Entities

All entities support standard OData V4 CRUD unless annotated with `@readonly`.

| Entity | Path | Access | Description |
|--------|------|--------|-------------|
| `Users` | `/Users` | `@readonly` | User list (all roles) |
| `Projects` | `/Projects` | Full CRUD | Active projects |
| `Tasks` | `/Tasks` | Full CRUD | Tasks under projects |
| `Timesheets` | `/Timesheets` | Full CRUD | Monthly timesheet containers |
| `TimesheetEntries` | `/TimesheetEntries` | Full CRUD | Individual time log rows |
| `ApprovalHistories` | `/ApprovalHistories` | `@readonly` | Immutable approval audit trail |

### OData Query Examples

```http
# Get all projects
GET /api/timesheet/Projects?$filter=isActive eq true

# Get timesheets for current user — use $filter with user ID
GET /api/timesheet/Timesheets?$filter=user_ID eq '<uuid>'

# Get entries for a specific timesheet, ordered by date
GET /api/timesheet/TimesheetEntries?$filter=timesheet_ID eq '<uuid>'&$orderby=date asc
```

### Functions

| Function | Path | Description |
|----------|------|-------------|
| `userInfo()` | `GET /userInfo()` | Returns the logged-in user's profile |
| `getApprovableTimesheets()` | `GET /getApprovableTimesheets()` | Timesheets where the caller is the designated approver |

### Actions

#### `submitTimesheet`
Submit a Draft or Rejected timesheet to a Team Lead.

```http
POST /api/timesheet/submitTimesheet
Content-Type: application/json

{
  "timesheetId": "<uuid>",
  "approverId": "<team-lead-uuid>"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `timesheetId` | ✓ | ID of the timesheet to submit |
| `approverId` | optional | If omitted, the timesheet's existing `currentApprover` is kept |

→ Status: `Draft` / `Rejected` **→ Submitted**

---

#### `approveTimesheet`
Approve a single Submitted timesheet. Caller must be the designated `currentApprover`.

```http
POST /api/timesheet/approveTimesheet
{
  "timesheetId": "<uuid>",
  "comment": "Looks good"
}
```

→ Status: `Submitted` **→ Approved_By_TeamLead** (TeamLead) or **→ Approved** (Admin/Manager)

---

#### `rejectTimesheet`
Reject a single Submitted timesheet with a comment.

```http
POST /api/timesheet/rejectTimesheet
{
  "timesheetId": "<uuid>",
  "comment": "Hours are incorrect for Feb 10"
}
```

→ Status: `Submitted` / `Approved_By_TeamLead` **→ Rejected**

---

#### `bulkApproveTimesheets` _(new)_
Approve multiple timesheets at once. Partial failures are reported without rolling back successful approvals.

```http
POST /api/timesheet/bulkApproveTimesheets
{
  "timesheetIds": ["<uuid1>", "<uuid2>", "<uuid3>"],
  "comment": "All verified"
}
```

**Required role:** `TeamLead`, `Admin`, or `Manager`

Returns a summary string: `"Bulk approve: 3 succeeded, 0 failed."`

---

#### `bulkRejectTimesheets` _(new)_
Reject multiple timesheets at once with a shared comment.

```http
POST /api/timesheet/bulkRejectTimesheets
{
  "timesheetIds": ["<uuid1>", "<uuid2>"],
  "comment": "Please correct project codes"
}
```

**Required role:** `TeamLead`, `Admin`, or `Manager`  
`comment` is **required** for bulk reject.

---

#### `finishTimesheet`
Mark an Approved timesheet as Finished (archived).

```http
POST /api/timesheet/finishTimesheet
{ "timesheetId": "<uuid>" }
```

**Required role:** `Admin` or `Manager`

---

#### `submitToAdmin`
Team Lead forwards an `Approved_By_TeamLead` timesheet to a specific Admin for final sign-off.

```http
POST /api/timesheet/submitToAdmin
{
  "timesheetId": "<uuid>",
  "adminId": "<admin-uuid>"
}
```

---

#### `modifyEntryHours`
Team Lead or Admin overrides the approved hours for a single entry.

```http
POST /api/timesheet/modifyEntryHours
{
  "entryId": "<uuid>",
  "approvedHours": 7.5
}
```

**Required role:** `TeamLead`, `Admin`, or `Manager`

---

#### `exportToExcel` (per-timesheet)
Exports a single timesheet to an Excel file in the aTrung template format.

```http
POST /api/timesheet/exportToExcel
{ "timesheetId": "<uuid>" }
```

Returns binary `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

---

#### `importFromExcel` _(new)_
Import timesheet entries from an Excel file (aTrung template format).  
The file must be sent as a **base64-encoded** string in `fileContent`.

```http
POST /api/timesheet/importFromExcel
{
  "timesheetId": "<uuid>",
  "fileContent": "<base64-encoded xlsx>"
}
```

**Expected columns in the Excel file:**

| Col | Field | Required |
|-----|-------|----------|
| B | Date | ✓ |
| C | Type (Papierkram / Internal / Others) | optional |
| D | Task description | optional |
| E | Working location | optional |
| F | Hours | ✓ |
| G | Project name or Papierkram code | ✓ |
| H | Note | optional |

Returns: `"Imported 12 entries successfully."` or partial error list.

---

---

## AdminService

### OData Entities

| Entity | Path | Access | Description |
|--------|------|--------|-------------|
| `Projects` | `/Projects` | Full CRUD | All projects (admin view) |
| `Tasks` | `/Tasks` | Full CRUD | All tasks |
| `Users` | `/Users` | Full CRUD | User management |
| `Timesheets` | `/Timesheets` | Full CRUD | All timesheets (admin override allowed) |
| `TimesheetEntries` | `/TimesheetEntries` | Full CRUD | All entries (admin override) |
| `AuditLogs` | `/AuditLogs` | `@readonly` | All change audit records |
| `ApprovalHistories` | `/ApprovalHistories` | `@readonly` | Complete approval trail |
| `ExportLogs` | `/ExportLogs` | `@readonly` _(new)_ | History of all admin Excel exports |

### Actions

#### `exportToExcel` _(enhanced)_
Export all matching timesheet entries to an Excel file with optional filters.  
Creates an `ExportLog` record for download history.

```http
POST /api/admin/exportToExcel
{
  "year": 2026,
  "month": 2,
  "userId": "<uuid-or-null>",
  "projectId": "<uuid-or-null>",
  "from": "2026-02-01",
  "to": "2026-02-28"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `year` | ✓ | Calendar year |
| `month` | optional | If omitted with `year` only → exports entire year |
| `userId` | optional | Filter to one user; null = all users |
| `projectId` | optional | Filter to one project; null = all projects |
| `from` / `to` | optional | Explicit date range, overrides month/year |

Returns binary Excel file + creates ExportLog record.

---

#### `syncProjects` _(new)_
Manually trigger a sync of projects from the Papierkram API.

```http
POST /api/admin/syncProjects
{}
```

**Requires env vars:**
```
PAPIERKRAM_API_KEY=<your token>
PAPIERKRAM_BASE_URL=https://demo.papierkram.de   # or your company domain
```

If the env var is missing, returns a setup guide instead of failing.

---

#### `sendEmailToGermany` _(new)_
Send the most recent (or specific) Excel export to the German team via SMTP.

```http
POST /api/admin/sendEmailToGermany
{
  "exportId": "<ExportLog-uuid-or-null>",
  "recipientEmail": "contact@german-client.de"
}
```

**Requires env vars:**
```
SMTP_HOST=smtp.gmail.com
SMTP_USER=yourname@yourcompany.com
SMTP_PASS=yourpassword
SMTP_PORT=587                   # optional, default 587
SMTP_SECURE=false               # optional, default false
GERMANY_EMAIL=default@client.de # optional default recipient
```

If env vars are missing, returns a setup guide.

---

#### `adminModifyEntryHours` _(new)_
Admin override of approved hours on a specific entry. Writes an `AuditLog` record.

```http
POST /api/admin/adminModifyEntryHours
{
  "entryId": "<uuid>",
  "approvedHours": 7.5,
  "note": "Adjusted per project manager request"
}
```

Returns: `"Hours updated: 8 → 7.5 (Note: Adjusted per project manager request)"`

---

## Database Entities

### ExportLog _(new)_

Tracks every Excel export made by an Admin. Used for download history.

| Field | Type | Description |
|-------|------|-------------|
| `ID` | UUID | Primary key |
| `exportedBy` | → User | Admin who triggered the export |
| `exportDate` | DateTime | Timestamp of export |
| `fromDate` | Date | Filter: start date |
| `toDate` | Date | Filter: end date |
| `userId` | String | Filter: user ID (null = all) |
| `projectId` | String | Filter: project ID (null = all) |
| `totalEntries` | Integer | Number of entries exported |
| `filePath` | String | File path (for future blob storage) |
| `filters` | String | JSON snapshot of all applied filters |

```http
# View export history
GET /api/admin/ExportLogs?$orderby=exportDate desc
```

---

## Environment Variable Reference

| Variable | Required For | Description |
|----------|-------------|-------------|
| `PAPIERKRAM_API_KEY` | `syncProjects` | Papierkram REST API Bearer token |
| `PAPIERKRAM_BASE_URL` | `syncProjects` | Base URL, e.g. `https://demo.papierkram.de` |
| `SMTP_HOST` | `sendEmailToGermany` | SMTP server hostname |
| `SMTP_USER` | `sendEmailToGermany` | SMTP login username |
| `SMTP_PASS` | `sendEmailToGermany` | SMTP login password |
| `SMTP_PORT` | optional | SMTP port (default: 587) |
| `SMTP_SECURE` | optional | Use TLS (default: false) |
| `GERMANY_EMAIL` | optional | Default recipient for Germany export emails |

---

## Handler File Map

```
srv/
├── timesheet-service.cds          # TimesheetService definition
├── timesheet-service.ts           # Entry point — registers all handlers
├── admin-service.cds              # AdminService definition
├── admin-service.ts               # Entry point — registers all handlers
├── handlers/
│   ├── timesheet/
│   │   ├── TimesheetAuthHandler.ts      # userInfo() function
│   │   ├── TimesheetEntryHandler.ts     # Draft enforcement, modifyEntryHours
│   │   ├── TimesheetWorkflowHandler.ts  # submit / approve / reject / finish / submitToAdmin
│   │   ├── TimesheetExportHandler.ts    # exportToExcel (per-timesheet)
│   │   ├── TimesheetBulkHandler.ts      # bulkApproveTimesheets, bulkRejectTimesheets ← NEW
│   │   └── TimesheetImportHandler.ts    # importFromExcel ← NEW
│   └── admin/
│       ├── AdminExportHandler.ts        # exportToExcel (admin, with filters), sendEmailToGermany, adminModifyEntryHours ← NEW
│       └── AdminProjectHandler.ts       # syncProjects (Papierkram) ← NEW
└── lib/
    ├── user-resolver.ts
    └── utils/
        └── ExcelService.js              # generateTimesheetExcel()
```
