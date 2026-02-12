export interface TimesheetEntry {
    id: string
    date: string // YYYY-MM-DD
    projectId: string
    timesheetId?: string
    hours: number
    description?: string
}

export interface Timesheet {
    id: string
    month: number
    year: number
    status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected'
    entries: TimesheetEntry[]
}

export interface Project {
    id: string
    name: string
    code: string
    isActive: boolean
}

export interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
}
