# Sprint 1 Backlog

> **Sprint 1** | Feb 13 – Feb 20, 2026 | **Team:** 3 Developers | **Target Launch:** March 01, 2026
> **Source:** Sprint_1_Back_Log.xlsx

---

## Sprint Goals & Metadata

| Field         | Value                           |
| ------------- | ------------------------------- |
| Sprint Number | Sprint 1                        |
| Duration      | 1 week (Feb 13 – Feb 20, 2026) |
| Team Size     | 3 Developers                    |
| Target Launch | March 01, 2026                  |
| Scrum Master  | TBD                             |
| Product Owner | TBD                             |

### Goals

| #  | Goal                                                                  | Category     | Priority | Status      |
| -- | --------------------------------------------------------------------- | ------------ | -------- | ----------- |
| 1  | Setup project structure and development environment                   | Foundation   | HIGH     | Not Started |
| 2  | Implement Authentication & User Management                            | Security     | HIGH     | Not Started |
| 3  | Database design & setup for core entities (all 7 tables)              | Data Layer   | HIGH     | Not Started |
| 4  | Basic Timesheet entry UI (Manual logging)                             | Core Feature | HIGH     | Not Started |
| 5  | Approval workflow: DRAFT→SUBMITTED→APPROVED→REJECTED state machine | Workflow     | HIGH     | Not Started |
| 6  | Team Lead review dashboard (pending list, bulk approve/reject)        | Core Feature | HIGH     | Not Started |
| 7  | aTrung Admin panel (edit approved entries, dashboard charts)          | Core Feature | HIGH     | Not Started |
| 8  | Excel export with pivot table (aTrung's template format)              | Export       | HIGH     | Not Started |
| 9  | Email integration: send Excel to Germany (nodemailer/SMTP)            | Integration  | MEDIUM   | Not Started |
| 10 | Notification system (submit/approve/reject triggers)                  | Core Feature | MEDIUM   | Not Started |
| 11 | Papierkram API project sync (daily cron + manual trigger)             | Integration  | MEDIUM   | Not Started |
| 12 | Audit log & export log tables + UI                                    | Admin        | MEDIUM   | Not Started |
| 13 | Role-based access control (Staff / Team Lead / Admin guards)          | Security     | HIGH     | Not Started |

### Key Deliverables

- [X] React Frontend with basic routing & authentication
- [X] SAP CAP Backend with 7 core entities (User, Project, Task, Timesheet, TimesheetEntry, ApprovalHistory, AuditLog)
- [X] Database schema with proper relationships & FK coverage
- [ ] Login/Register UI complete
- [ ] Timesheet entry form (manual input)
- [ ] Project and Task selection dropdowns
- [ ] Approval history tracking infrastructure

### Success Criteria

- [ ] User can login/logout successfully
- [ ] User can create a new timesheet entry
- [ ] System displays projects and tasks from the database
- [ ] Database stores timesheet entries with proper validation
- [ ] Approval history is tracked automatically on status changes
- [ ] Code review completed for all features
- [ ] Zero formula/data errors in the schema

---

## Database Schema (7 Entities)

### Entity: User

| Field      | Type                | Required | Default  | Description                           |
| ---------- | ------------------- | -------- | -------- | ------------------------------------- |
| id (cuid)  | UUID / String(36)   | Yes      | Auto     | Primary key                           |
| email      | String(100)         | Yes      | —       | Unique user email                     |
| firstName  | String(50)          | No       | —       | Given name                            |
| lastName   | String(50)          | No       | —       | Family name                           |
| role       | UserRole enum       | Yes      | Employee | Employee / TeamLead / Manager / Admin |
| isActive   | Boolean             | Yes      | true     | Soft-delete flag                      |
| manager_id | Association → User | No       | —       | Self-ref to direct supervisor         |
| createdAt  | DateTime            | Yes      | NOW()    | Managed by @sap/cds                   |
| modifiedAt | DateTime            | Yes      | NOW()    | Auto-updated                          |

### Entity: Project

| Field       | Type                | Required | Default | Description                               |
| ----------- | ------------------- | -------- | ------- | ----------------------------------------- |
| id (cuid)   | UUID / String(36)   | Yes      | Auto    | Primary key                               |
| name        | String(100)         | Yes      | —      | Project display name                      |
| description | String(500)         | No       | —      | Project description                       |
| type        | ProjectType enum    | Yes      | Others  | Papierkram / Internal / External / Others |
| code        | String(20)          | Yes      | —      | Short project code                        |
| isActive    | Boolean             | Yes      | true    | Active flag                               |
| user_id     | Association → User | No       | —      | Project owner / manager                   |

### Entity: Task

| Field       | Type                   | Required | Default | Description                               |
| ----------- | ---------------------- | -------- | ------- | ----------------------------------------- |
| id (cuid)   | UUID / String(36)      | Yes      | Auto    | Primary key                               |
| project_id  | Association → Project | Yes      | —      | Parent project                            |
| name        | String(100)            | Yes      | —      | Task name                                 |
| description | String(500)            | No       | —      | Task details                              |
| startDate   | Date                   | No       | —      | Planned start date                        |
| endDate     | Date                   | No       | —      | Planned end date                          |
| status      | TaskStatus enum        | Yes      | Open    | Open / InProgress / Completed / Cancelled |

### Entity: Timesheet

| Field              | Type                | Required | Default | Description                                                               |
| ------------------ | ------------------- | -------- | ------- | ------------------------------------------------------------------------- |
| id (cuid)          | UUID / String(36)   | Yes      | Auto    | Primary key                                                               |
| user_id            | Association → User | Yes      | —      | Owner employee                                                            |
| month              | Integer             | Yes      | —      | Calendar month (1–12)                                                    |
| year               | Integer             | Yes      | —      | Calendar year                                                             |
| status             | TimesheetStatus     | Yes      | Draft   | Draft / Submitted / Approved_By_TeamLead / Approved / Rejected / Finished |
| submitDate         | DateTime            | No       | —      | When employee submitted                                                   |
| approveDate        | DateTime            | No       | —      | When fully approved                                                       |
| finishedDate       | DateTime            | No       | —      | When archived                                                             |
| currentApprover_id | Association → User | No       | —      | Who must act next                                                         |
| comment            | String(1000)        | No       | —      | Reviewer/employee comment                                                 |

### Entity: TimesheetEntry

| Field              | Type                     | Required | Default | Description                  |
| ------------------ | ------------------------ | -------- | ------- | ---------------------------- |
| id (cuid)          | UUID / String(36)        | Yes      | Auto    | Primary key                  |
| timesheet_id       | Association → Timesheet | Yes      | —      | Parent timesheet             |
| project_id         | Association → Project   | Yes      | —      | Linked project               |
| task_id            | Association → Task      | No       | —      | Optional task                |
| date               | Date                     | Yes      | —      | Working date                 |
| loggedHours        | Decimal(5,2)             | Yes      | —      | Hours by employee            |
| approvedHours      | Decimal(5,2)             | No       | —      | Hours overridden by approver |
| hoursModifiedBy_id | Association → User      | No       | —      | Who changed hours            |
| hoursModifiedAt    | DateTime                 | No       | —      | When hours were changed      |
| description        | String(500)              | No       | —      | Task description / notes     |

### Entity: ApprovalHistory

| Field        | Type                     | Required | Description                                           |
| ------------ | ------------------------ | -------- | ----------------------------------------------------- |
| id (cuid)    | UUID / String(36)        | Yes      | Primary key                                           |
| timesheet_id | Association → Timesheet | Yes      | Linked timesheet                                      |
| actor_id     | Association → User      | Yes      | Who performed the action                              |
| action       | String(30)               | Yes      | Submitted / Approved / Rejected / Modified / Finished |
| fromStatus   | TimesheetStatus          | No       | Previous workflow status                              |
| toStatus     | TimesheetStatus          | No       | New workflow status                                   |
| comment      | String(1000)             | No       | Reviewer comment                                      |
| timestamp    | DateTime                 | Yes      | Exact action time (immutable)                         |

### Entity: AuditLog

| Field     | Type              | Required | Description                               |
| --------- | ----------------- | -------- | ----------------------------------------- |
| id (cuid) | UUID / String(36) | Yes      | Primary key                               |
| entity_   | String(50)        | Yes      | Entity type name (e.g.`TimesheetEntry`) |
| entityId  | String(36)        | Yes      | UUID of changed record                    |
| action    | String(20)        | Yes      | Created / Updated / Deleted               |
| userId    | String(36)        | No       | UUID of actor                             |
| changes   | String(2000)      | No       | JSON diff of changes                      |

### Enum Types

| Enum            | Valid Values                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| UserRole        | `Employee` \| `TeamLead` \| `Manager` \| `Admin`                                               |
| TimesheetStatus | `Draft` \| `Submitted` \| `Approved_By_TeamLead` \| `Approved` \| `Rejected` \| `Finished` |
| TaskStatus      | `Open` \| `InProgress` \| `Completed` \| `Cancelled`                                           |
| ProjectType     | `Papierkram` \| `Internal` \| `External` \| `Others`                                           |

---

## User Stories & Tasks

> **Total:** 3 User Stories | 33 Tasks | ~66h estimated | Sprint: Feb 13–20, 2026

### US-1: Project Setup & Initialization

> **Story Points:** 8 | **Priority:** HIGH | **Owner:** Tech Lead

| Task ID | Description                                  | Type  | Estimate | Priority |
| ------- | -------------------------------------------- | ----- | -------- | -------- |
| T-001   | Create project structure (monorepo)          | Setup | 2h       | HIGH     |
| T-002   | Setup React 18 + TypeScript + Vite           | Setup | 2h       | HIGH     |
| T-003   | Setup SAP CAP backend project (`cds init`) | Setup | 2h       | HIGH     |
| T-004   | Configure Tailwind CSS + shadcn/ui           | Setup | 2h       | MEDIUM   |
| T-005   | Setup SQLite (dev) / HANA connection (prod)  | Setup | 1h       | HIGH     |
| T-006   | Configure ESLint + Prettier                  | Setup | 1h       | LOW      |
| T-007   | Create README with setup guide               | Docs  | 1h       | MEDIUM   |

### US-2: Basic Timesheet Entry & DB Schema

> **Story Points:** 13 | **Priority:** HIGH | **Owner:** Full Stack Dev

| Task ID | Description                                           | Type     | Estimate | Priority |
| ------- | ----------------------------------------------------- | -------- | -------- | -------- |
| T-201   | Define `Projects` entity in CDS schema              | Backend  | 2h       | HIGH     |
| T-202   | Define `Timesheets` entity in CDS schema            | Backend  | 3h       | HIGH     |
| T-203   | Define `Task` entity in CDS schema                  | Backend  | 2h       | HIGH     |
| T-204   | Define `TimesheetEntry` entity in CDS schema        | Backend  | 2h       | HIGH     |
| T-205   | Define `ApprovalHistory` entity in CDS schema       | Backend  | 2h       | HIGH     |
| T-206   | Define `AuditLog` entity in CDS schema              | Backend  | 1h       | MEDIUM   |
| T-207   | Create `GET /projects` endpoint                     | Backend  | 2h       | HIGH     |
| T-208   | Create `POST /timesheets` endpoint                  | Backend  | 3h       | HIGH     |
| T-209   | Add validation rules (hours, date, required fields)   | Backend  | 2h       | MEDIUM   |
| T-210   | Create Timesheet Entry form UI                        | Frontend | 4h       | HIGH     |
| T-211   | Implement project + task dropdowns                    | Frontend | 2h       | HIGH     |
| T-212   | Add date picker (exclude weekends)                    | Frontend | 2h       | MEDIUM   |
| T-213   | Create type selector (Papierkram / Internal / Others) | Frontend | 2h       | MEDIUM   |
| T-214   | Show success/error messages (toast)                   | Frontend | 1h       | MEDIUM   |

### US-3: Excel Import / Export

> **Story Points:** 13 | **Priority:** HIGH | **Owner:** Full Stack Dev

| Task ID | Description                                   | Type     | Estimate | Priority |
| ------- | --------------------------------------------- | -------- | -------- | -------- |
| T-301   | Install XLSX (SheetJS) – frontend            | Setup    | 0.5h     | HIGH     |
| T-302   | Install exceljs – backend                    | Setup    | 0.5h     | HIGH     |
| T-303   | Create Excel template parser (backend)        | Backend  | 3h       | HIGH     |
| T-304   | Validate Excel data format & required columns | Backend  | 2h       | HIGH     |
| T-305   | Bulk insert TimesheetEntries from Excel       | Backend  | 3h       | HIGH     |
| T-306   | `POST /timesheets/import` endpoint          | Backend  | 2h       | HIGH     |
| T-307   | `GET /timesheets/export` endpoint           | Backend  | 3h       | HIGH     |
| T-308   | Build Import UI with drag & drop              | Frontend | 3h       | HIGH     |
| T-309   | Show import preview table (5–10 rows)        | Frontend | 2h       | MEDIUM   |
| T-310   | Add Export button with Excel download         | Frontend | 2h       | HIGH     |
| T-311   | Handle import errors & display feedback       | Frontend | 2h       | MEDIUM   |
| T-312   | Add template download link                    | Frontend | 1h       | MEDIUM   |

### Sprint Summary

| Metric                 | Value               |
| ---------------------- | ------------------- |
| Total User Stories     | 3                   |
| Total Story Points     | 34                  |
| Total Tasks            | 33                  |
| Estimated Hours        | ~66h                |
| Team Velocity Target   | 34 pts / 1 week     |
| Average Capacity / Dev | 22h (full capacity) |

---

## API Endpoints & Role Access

| Method     | Endpoint                | Description                     | Staff | Team Lead | Admin |
| ---------- | ----------------------- | ------------------------------- | ----- | --------- | ----- |
| `POST`   | `/timesheets`         | Create entry                    | ✓    | —        | —    |
| `PUT`    | `/timesheets/:id`     | Update (Staff=DRAFT, Admin=any) | ✓    | —        | ✓    |
| `DELETE` | `/timesheets/:id`     | Delete (DRAFT only)             | ✓    | —        | —    |
| `GET`    | `/timesheets`         | List with filters               | own   | team      | all   |
| `GET`    | `/timesheets/:id`     | Detail view                     | own   | team      | all   |
| `POST`   | `/timesheets/submit`  | Submit to Team Lead             | ✓    | —        | —    |
| `POST`   | `/timesheets/approve` | Approve entries                 | —    | ✓        | —    |
| `POST`   | `/timesheets/reject`  | Reject with note                | —    | ✓        | —    |
| `GET`    | `/timesheets/export`  | Export Excel                    | —    | —        | ✓    |
| `GET`    | `/projects`           | List projects                   | ✓    | ✓        | ✓    |
| `POST`   | `/projects/sync`      | Sync from Papierkram            | —    | —        | ✓    |
| `GET`    | `/users`              | List users                      | —    | team      | ✓    |
| `POST`   | `/users`              | Create user                     | —    | —        | ✓    |
| `PUT`    | `/users/:id`          | Update / assign role            | —    | —        | ✓    |
| `GET`    | `/audit-logs`         | View audit logs                 | —    | —        | ✓    |
| `GET`    | `/export-logs`        | Export history                  | —    | —        | ✓    |

---

## Notification Triggers

| Trigger Event             | Notify         | Message                                   |
| ------------------------- | -------------- | ----------------------------------------- |
| Staff submits timesheet   | Team Lead      | New submission pending review             |
| Team Lead approves        | Staff + Admin  | Timesheet approved                        |
| Team Lead rejects         | Staff          | Timesheet rejected — see rejection_note  |
| Admin exports Excel       | Admin (CC: TL) | Export completed — email sent to Germany |
| Papierkram sync completes | Admin          | Project list updated                      |
