using { sap.timesheet as db } from '../db/schema';

/**
 * Admin Service
 * Provides admin operations for master data, reports, and final approvals.
 */
service AdminService @(path: '/api/admin', requires: 'admin', impl: './admin-service') {

  // ── Master Data Management ────────────────────────────────────────────────
  entity Projects          as projection on db.Project;
  entity Tasks             as projection on db.Task;
  entity Users             as projection on db.User;

  // ── Timesheets (full access for review & override) ────────────────────────
  entity Timesheets        as projection on db.Timesheet;
  entity TimesheetEntries  as projection on db.TimesheetEntry;

  // ── Audit ─────────────────────────────────────────────────────────────────
  @readonly entity AuditLogs          as projection on db.AuditLog;
  @readonly entity ApprovalHistories  as projection on db.ApprovalHistory;

  // ── Actions ───────────────────────────────────────────────────────────────
  action exportToExcel(month: Integer, year: Integer, projectId: String) returns String;
}
