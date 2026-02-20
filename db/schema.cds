namespace sap.timesheet;

using { cuid, managed } from '@sap/cds/common';

// ─── Enums / Types ──────────────────────────────────────────────────────────

type UserRole      : String(20) enum { Employee; TeamLead; Manager; Admin; };
type TimesheetStatus : String(30) enum {
  Draft;                 // User is editing
  Submitted;             // Waiting for Team Lead review
  Approved_By_TeamLead;  // Team Lead approved, waiting for Admin
  Approved;              // Admin approved – finalised
  Rejected;              // Returned to employee
  Finished;              // Archived / done
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
