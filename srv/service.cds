using { sap.timesheet as db } from '../db/schema';

/**
 * Timesheet Service
 * Provides timesheet logging and management
 */
service TimesheetService @(path: '/api/timesheet') {
  
  // User Operations
  entity Users as projection on db.User;
  
  // Master Data
  entity Projects as projection on db.Project;
  
  // Timesheet Operations
  entity Timesheets as projection on db.Timesheet;
  entity TimesheetEntries as projection on db.TimesheetEntry;
  
  // Actions
  action submitTimesheet(timesheetId: String) returns String;
  action approveTimesheet(timesheetId: String, comment: String) returns String;
  action rejectTimesheet(timesheetId: String, comment: String) returns String;
}

/**
 * Admin Service
 * Provides admin operations for master data and reports
 */
service AdminService @(path: '/api/admin') {
  
  // Master Data Management
  entity Projects as projection on db.Project;
  entity Users as projection on db.User;
  
  // Audit Logs
  @readonly entity AuditLogs as projection on db.AuditLog;
  
  // All Timesheets (for review and override)
  entity Timesheets as projection on db.Timesheet;
  entity TimesheetEntries as projection on db.TimesheetEntry;
  
  // Actions
  action exportToExcel(month: Integer, year: Integer, projectId: String) returns String;
}
