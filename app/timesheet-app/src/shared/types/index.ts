export type ProjectType = 'Papierkram' | 'Internal' | 'External' | 'Other'
export type TimesheetStatusType = 'Draft' | 'Submitted' | 'Approved_By_TeamLead' | 'Approved' | 'Rejected' | 'Finished'
export type UserRole = 'Employee' | 'TeamLead' | 'Admin'

export interface TimesheetEntry {
    id: string
    date: string // YYYY-MM-DD
    projectId: string
    projectName?: string
    taskId?: string
    taskName?: string
    timesheetId?: string
    hours: number
    approvedHours?: number
    description?: string
}

export interface ApprovalHistory {
    id: string
    action: string          // Submitted, Approved, Rejected, Modified, Finished
    fromStatus?: string
    toStatus?: string
    comment?: string
    timestamp: string
    actor?: {
        id: string
        firstName: string
        lastName: string
        role: string
    }
}

export interface Timesheet {
    id: string
    month: number
    year: number
    status: TimesheetStatusType
    entries: TimesheetEntry[]
    submitDate?: string
    approveDate?: string
    finishedDate?: string
    totalHours?: number
    comment?: string
    currentApprover?: {
        id: string
        firstName: string
        lastName: string
        role: string
    }
    user?: {
        id: string
        firstName: string
        lastName: string
        email: string
        role: string
    }
    approvalHistory?: ApprovalHistory[]
}

export interface Project {
    id: string
    name: string
    code: string
    type: ProjectType
    description?: string
    isActive: boolean
}

export interface Task {
    id: string
    projectId: string
    name: string
    description?: string
    startDate?: string
    endDate?: string
    status: 'Open' | 'InProgress' | 'Completed' | 'Cancelled'
}

export interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
    manager?: {
        id: string
        firstName: string
        lastName: string
        role: string
    }
}
