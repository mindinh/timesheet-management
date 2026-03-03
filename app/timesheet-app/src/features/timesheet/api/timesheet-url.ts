import { SERVICE_URL } from '@/shared/api/service-url'

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
} as const

// TeamLead endpoints
export const TEAMLEAD_URL = {
    pendingTimesheets: `${SERVICE_URL.teamlead}/getPendingTimesheets()`,
    approve: `${SERVICE_URL.teamlead}/approveTimesheet`,
    reject: `${SERVICE_URL.teamlead}/rejectTimesheet`,
    bulkApprove: `${SERVICE_URL.teamlead}/bulkApproveTimesheets`,
    bulkReject: `${SERVICE_URL.teamlead}/bulkRejectTimesheets`,
    modifyEntryHours: `${SERVICE_URL.teamlead}/modifyEntryHours`,
    createBatch: `${SERVICE_URL.teamlead}/createBatch`,
    timesheets: `${SERVICE_URL.teamlead}/Timesheets`,
    users: `${SERVICE_URL.teamlead}/Users`,
} as const
