using { sap.timesheet as db } from '../db/schema';

/**
 * Admin Service
 * Provides admin operations for master data, reports, and final approvals.
 */
service AdminService @(path: '/api/admin', requires: 'Admin', impl: './admin-service') {

  // ── Master Data Management ────────────────────────────────────────────────
  entity Projects          as projection on db.Project;
  entity Tasks             as projection on db.Task;
  entity Users             as projection on db.User;

  // ── Timesheets (full access for review & override) ────────────────────────
  entity Timesheets        as projection on db.Timesheet;
  entity TimesheetBatches  as projection on db.TimesheetBatch;
  entity TimesheetEntries  as projection on db.TimesheetEntry;

  // ── Audit & Export History ────────────────────────────────────────────────
  @readonly entity AuditLogs          as projection on db.AuditLog;
  @readonly entity ApprovalHistories  as projection on db.ApprovalHistory;
  @readonly entity BatchHistories     as projection on db.BatchHistory;
  @readonly entity ExportLogs         as projection on db.ExportLog;

  // ── Export Actions ────────────────────────────────────────────────────────

  /**
   * Export timesheets to Excel with optional filters.
   * Admin can filter by month, year, a specific user, or a specific project.
   * The export record is stored in ExportLog for re-download history.
   *
   * @param month      - Calendar month (1–12). If omitted, all months are included.
   * @param year       - Calendar year (e.g. 2026). Required.
   * @param userId     - Filter to a single user's entries. Null = all users.
   * @param projectId  - Filter to a single project. Null = all projects.
   * @param from       - ISO date string: inclusive start date (e.g. 2026-02-01).
   * @param to         - ISO date string: inclusive end date (e.g. 2026-02-28).
   */
  action exportToExcel(
    month     : Integer,
    year      : Integer,
    userId    : String,
    projectId : String,
    from      : String,
    to        : String
  ) returns LargeBinary;

  /**
   * Trigger a manual sync of projects from the Papierkram API.
   * Requires PAPIERKRAM_API_KEY environment variable to be set.
   */
  action syncProjects() returns String;

  /**
   * Send the most recent (or a specific) exported Excel file to Germany via email.
   * Requires SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS) to be configured.
   *
   * @param exportId       - The ExportLog ID to re-attach. If empty, uses the latest export.
   * @param recipientEmail - Target email address (defaults to env GERMANY_EMAIL if omitted).
   */
  action sendEmailToGermany(exportId: String, recipientEmail: String) returns String;

  /** 
   * Admin override: directly set approved hours on a timesheet entry.
   * Logs an AuditLog record for the change.
   */
  action adminModifyEntryHours(entryId: String, approvedHours: Decimal, note: String) returns String;

  /**
   * Finalize all timesheets in a batch (sets them to Finished).
   */
  action markBatchDone(batchId: String) returns String;

  /**
   * Reject all timesheets in a batch and return them to the submitted state.
   */
  action rejectBatch(batchId: String, comment: String) returns String;

  /**
   * Dashboard Statistics
   * Returns a JSON string containing OT metrics, missing timesheets, and an activity feed.
   */
  action getDashboardStats(month: Integer, year: Integer) returns String;
}
