using { sap.timesheet as db } from '../db/schema';

/**
 * Timesheet Service
 * Provides timesheet logging and management for all authenticated users.
 */
service TimesheetService @(path: '/api/timesheet', requires: 'authenticated-user', impl: './timesheet-service') {

  // ── Read-only look-ups ────────────────────────────────────────────────────
  @readonly entity Users as projection on db.User {
    *, manager : redirected to Users
  };

  // ── Master Data ───────────────────────────────────────────────────────────
  entity Projects          as projection on db.Project;
  entity Tasks             as projection on db.Task;

  // ── Timesheet Operations ──────────────────────────────────────────────────
  entity Timesheets        as projection on db.Timesheet;
  entity TimesheetEntries  as projection on db.TimesheetEntry;

  // ── Approval History (read-only for regular users) ────────────────────────
  @readonly entity ApprovalHistories as projection on db.ApprovalHistory;

  // ── Functions ─────────────────────────────────────────────────────────────
  function userInfo() returns {
    id        : String;
    email     : String;
    firstName : String;
    lastName  : String;
    role      : String;
  };

  // ── Workflow Actions ──────────────────────────────────────────────────────
  action submitTimesheet  (timesheetId: String, approverId: String)    returns String;
  action approveTimesheet (timesheetId: String, comment: String)      returns String;
  action rejectTimesheet  (timesheetId: String, comment: String)      returns String;
  action finishTimesheet  (timesheetId: String)                       returns String;

  /** Team Lead forwards an Approved timesheet to the final Admin */
  action submitToAdmin    (timesheetId: String, adminId: String)      returns String;

  /** Team Lead or Admin can override hours on a single entry */
  action modifyEntryHours (entryId: String, approvedHours: Decimal)   returns String;

  /** Returns timesheets where the current user is the designated approver */
  function getApprovableTimesheets() returns array of Timesheets;

  /** Export a timesheet to Excel based on the predefined template */
  action exportToExcel(timesheetId: String) returns LargeBinary;
}
