import { SERVICE_URL } from '@/shared/api/service-url';

// Timesheet endpoints
export const TIMESHEET_URL = {
  timesheets: `${SERVICE_URL.timesheet}/Timesheets`,
  timesheetById: (id: string) => `${SERVICE_URL.timesheet}/Timesheets(${id})`,
  submit: `${SERVICE_URL.timesheet}/submitTimesheet`,
  approve: `${SERVICE_URL.timesheet}/approveTimesheet`,
  reject: `${SERVICE_URL.timesheet}/rejectTimesheet`,
  finish: `${SERVICE_URL.timesheet}/finishTimesheet`,
  submitToAdmin: `${SERVICE_URL.timesheet}/submitToAdmin`,
  bulkSubmitToAdmin: `${SERVICE_URL.timesheet}/bulkSubmitToAdmin`,
  modifyEntryHours: `${SERVICE_URL.timesheet}/modifyEntryHours`,
  exportToExcel: `${SERVICE_URL.timesheet}/exportToExcel`,
  approvable: `${SERVICE_URL.timesheet}/getApprovableTimesheets()`,
  getMyTeamLead: `${SERVICE_URL.timesheet}/getMyTeamLead()`,
  getTeamLeads: `${SERVICE_URL.timesheet}/getTeamLeads()`,
} as const;

// TeamLead endpoints
export const TEAMLEAD_URL = {
  pendingTimesheets: `${SERVICE_URL.teamlead}/getPendingTimesheets()`,
  approve: `${SERVICE_URL.teamlead}/approveTimesheet`,
  reopen: `${SERVICE_URL.teamlead}/reopenForEdit`,
  bulkApprove: `${SERVICE_URL.teamlead}/bulkApproveTimesheets`,
  bulkReopen: `${SERVICE_URL.teamlead}/bulkReopenForEdit`,
  modifyEntryHours: `${SERVICE_URL.teamlead}/modifyEntryHours`,
  createBatch: `${SERVICE_URL.teamlead}/createBatch`,
  timesheets: `${SERVICE_URL.teamlead}/Timesheets`,
  batches: `${SERVICE_URL.teamlead}/TimesheetBatches`,
  users: `${SERVICE_URL.teamlead}/Users`,
  getMyMembers: `${SERVICE_URL.teamlead}/getMyMembers()`,
  getUnassignedEmployees: `${SERVICE_URL.teamlead}/getUnassignedEmployees()`,
  assignMember: `${SERVICE_URL.teamlead}/assignMember`,
  removeMember: `${SERVICE_URL.teamlead}/removeMember`,
  createMember: `${SERVICE_URL.teamlead}/createMember`,
} as const;
