namespace sap.timesheet;

using { cuid, managed } from '@sap/cds/common';

// ─── Enums / Types ──────────────────────────────────────────────────────────

type UserRole      : String(20) enum { Employee; TeamLead; Manager; Admin; };
type TimesheetStatus : String(30) enum {
  Draft;                 // User is editing
  Submitted;             // Waiting for Team Lead review
  Approved;              // Team Lead approved – finalised (ready for batching)
  Rejected;              // Returned to employee
  Finished;              // Archived / done (Admin marked batch as Done)
};
type TaskStatus    : String(20) enum { Open; InProgress; Completed; Cancelled; };
type ProjectType   : String(20) enum { Papierkram; Internal; External; Others; };

// ─── User ───────────────────────────────────────────────────────────────────

/**
 * Represents employees, team leads, managers, and admins.
 * `manager` is the direct reporting line (self-ref for hierarchy).
 */
entity User : cuid, managed {
  email       : String(100) @mandatory;
  firstName   : String(50);
  lastName    : String(50);
  role        : UserRole default 'Employee';
  isActive    : Boolean default true;
  manager     : Association to User;              // direct supervisor / team lead
  directReports : Association to many User on directReports.manager = $self;
  timesheets  : Association to many Timesheet on timesheets.user = $self;
}

// ─── Project ────────────────────────────────────────────────────────────────

/**
 * Master data for projects.
 */
entity Project : cuid, managed {
  name        : String(100) @mandatory;
  description : String(500);
  type        : ProjectType default 'Others';
  code        : String(20)  @mandatory;
  isActive    : Boolean default true;
  user        : Association to User;
  tasks       : Composition of many Task on tasks.project = $self;
  entries     : Association to many TimesheetEntry on entries.project = $self;
}

// ─── Task ───────────────────────────────────────────────────────────────────

/**
 * A granular unit of work inside a Project.
 * Users log time against a Task rather than only a Project.
 */
entity Task : cuid, managed {
  project     : Association to Project @mandatory;
  name        : String(100) @mandatory;
  description : String(500);
  startDate   : Date;
  endDate     : Date;
  status      : TaskStatus default 'Open';
  entries     : Association to many TimesheetEntry on entries.task = $self;
}

// ─── Timesheet Batch ────────────────────────────────────────────────────────

/**
 * A group of timesheets approved by a Team Lead and forwarded to an Admin.
 */
entity TimesheetBatch : cuid, managed {
  teamLead    : Association to User @mandatory;          // who created the batch
  admin       : Association to User @mandatory;          // which admin it was sent to
  status      : String(20) default 'Pending';            // Pending, Processed
  timesheets  : Composition of many Timesheet on timesheets.batch = $self;
  history     : Composition of many BatchHistory on history.batch = $self;
}

// ─── Timesheet ──────────────────────────────────────────────────────────────

/**
 * Monthly timesheet container.
 * Follows the approval chain: Employee → Team Lead → Admin.
 */
entity Timesheet : cuid, managed {
  user           : Association to User @mandatory;
  month          : Integer @mandatory;              // 1-12
  year           : Integer @mandatory;              // e.g. 2026
  status         : TimesheetStatus default 'Draft';
  submitDate     : DateTime;
  approveDate    : DateTime;
  finishedDate   : DateTime;                        // date moved to Finished
  currentApprover : Association to User;            // who needs to act next
  batch          : Association to TimesheetBatch;   // which batch this belongs to
  comment        : String(1000);
  entries        : Composition of many TimesheetEntry on entries.timesheet = $self;
  approvalHistory : Composition of many ApprovalHistory on approvalHistory.timesheet = $self;
}

// ─── Timesheet Entry ────────────────────────────────────────────────────────

/**
 * Individual time-log row.
 * `loggedHours`   – the value entered by the employee.
 * `approvedHours` – the value (optionally) overridden by Team Lead / Admin.
 */
entity TimesheetEntry : cuid, managed {
  timesheet     : Association to Timesheet @mandatory;
  project       : Association to Project   @mandatory;
  task          : Association to Task;                   // optional – finer granularity
  date          : Date @mandatory;
  loggedHours   : Decimal(5,2) @mandatory;               // employee's original value
  approvedHours : Decimal(5,2);                           // modified by approver (nullable)
  hoursModifiedBy : Association to User;                   // who changed the hours
  hoursModifiedAt : DateTime;                              // when hours were changed
  description   : String(500);
}

// ─── Approval History ───────────────────────────────────────────────────────

/**
 * Immutable audit trail of every approval / rejection step.
 */
entity ApprovalHistory : cuid, managed {
  timesheet    : Association to Timesheet @mandatory;
  actor        : Association to User @mandatory;         // who performed the action
  action       : String(30) @mandatory;                  // Submitted, Approved, Rejected, Modified, Finished
  fromStatus   : TimesheetStatus;
  toStatus     : TimesheetStatus;
  comment      : String(1000);
  timestamp    : DateTime @mandatory;
}

// ─── Batch History ──────────────────────────────────────────────────────────

/**
 * Immutable audit trail of every batch action step.
 */
entity BatchHistory : cuid, managed {
  batch        : Association to TimesheetBatch @mandatory;
  actor        : Association to User @mandatory;         // who performed the action
  action       : String(30) @mandatory;                  // Created, Finished, Rejected
  status       : String(20);                             // Pending, Processed, Rejected
  comment      : String(1000);
  timestamp    : DateTime @mandatory;
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

/**
 * Generic change tracking for compliance.
 */
entity AuditLog : cuid, managed {
  entity_      : String(50) @mandatory;                  // e.g. 'TimesheetEntry'
  entityId     : String(36) @mandatory;
  action       : String(20) @mandatory;                  // Created, Updated, Deleted
  userId       : String(36);
  changes      : String(2000);
}

// ─── Export Log ─────────────────────────────────────────────────────────────

/**
 * Tracks every Excel export performed by Admin.
 * Allows re-download of previously exported files.
 */
entity ExportLog : cuid, managed {
  exportedBy   : Association to User @mandatory;         // Admin who triggered the export
  exportDate   : DateTime @mandatory;                    // When the export was created
  fromDate     : Date;                                   // Filter: start date
  toDate       : Date;                                   // Filter: end date
  userId       : String(36);                             // Filter: specific user (nullable = all)
  projectId    : String(36);                             // Filter: specific project (nullable = all)
  totalEntries : Integer default 0;                      // How many entries were exported
  filePath     : String(500);                            // Stored file path (future: blob storage)
  filters      : String(1000);                           // JSON snapshot of applied filters
}
