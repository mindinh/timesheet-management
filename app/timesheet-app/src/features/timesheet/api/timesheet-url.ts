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
