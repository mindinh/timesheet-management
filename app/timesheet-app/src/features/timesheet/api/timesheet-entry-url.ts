import { SERVICE_URL } from '@/shared/api/service-url'

// Timesheet entry endpoints
export const TIMESHEET_ENTRY_URL = {
    entries: `${SERVICE_URL.timesheet}/TimesheetEntries`,
    entryById: (id: string) => `${SERVICE_URL.timesheet}/TimesheetEntries(${id})`,
} as const
