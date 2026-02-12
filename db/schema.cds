namespace sap.timesheet;

using { cuid, managed } from '@sap/cds/common';

/**
 * User entity
 * Represents employees who log time
 */
entity User : cuid, managed {
  email       : String(100) @mandatory;
  firstName   : String(50);
  lastName    : String(50);
  role        : String(20) default 'Employee'; // Employee, Manager, Admin
  isActive    : Boolean default true;
  timesheets  : Association to many Timesheet on timesheets.user = $self;
}

/**
 * Project entity
 * Master data for projects
 */
entity Project : cuid, managed {
  name        : String(100) @mandatory;
  description : String(500);
  code        : String(20) @mandatory;
  isActive    : Boolean default true;
  user        : Association to User;
  entries     : Association to many TimesheetEntry on entries.project = $self;
}

/**
 * Timesheet entity
 * Monthly timesheet container
 */
entity Timesheet : cuid, managed {
  user        : Association to User @mandatory;
  month       : Integer @mandatory; // 1-12
  year        : Integer @mandatory; // e.g., 2026
  status      : String(20) default 'Draft'; // Draft, Submitted, Approved, Rejected
  submitDate  : DateTime;
  approveDate : DateTime;
  approver    : Association to User;
  comment     : String(1000);
  entries     : Composition of many TimesheetEntry on entries.timesheet = $self;
}

/**
 * Timesheet Entry entity
 * Individual time log entry
 */
entity TimesheetEntry : cuid, managed {
  timesheet   : Association to Timesheet @mandatory;
  project     : Association to Project @mandatory;
  date        : Date @mandatory;
  hours       : Decimal(5,2) @mandatory; // e.g., 8.0, 7.5
  description : String(500);
}

/**
 * Audit Log entity
 * Track all changes for compliance
 */
entity AuditLog : cuid, managed {
  entity      : String(50) @mandatory; // e.g., 'TimesheetEntry'
  entityId    : String(36) @mandatory;
  action      : String(20) @mandatory; // Created, Updated, Deleted
  userId      : String(36);
  changes     : String(2000);
}
