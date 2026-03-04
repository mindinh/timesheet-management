import { api } from '@/shared/api/http'
import { TEAMLEAD_URL } from '@/features/timesheet/api/timesheet-url'
import type { Timesheet, TimesheetEntry, TimesheetStatusType } from '@/shared/types'

// ---------- Queries ----------

export async function getPendingTimesheets(): Promise<Timesheet[]> {
    const data: unknown = await api.get(TEAMLEAD_URL.pendingTimesheets)
    const list = (data && typeof data === 'object' && 'value' in data ? (data as any).value : data) as Record<string, unknown>[]
    return list.map((ts) => ({
        id: String(ts.id || ts.ID),
        month: Number(ts.month),
        year: Number(ts.year),
        status: ts.status as TimesheetStatusType,
        entries: [],
        submitDate: ts.submitDate as string | undefined,
        approveDate: ts.approveDate as string | undefined,
        totalHours: Number(ts.totalLoggedHours || ts.totalHours) || 0,
        comment: ts.comment as string | undefined,
        user: ts.user ? {
            id: String((ts.user as Record<string, any>).id || (ts.user as Record<string, any>).ID),
            firstName: String((ts.user as Record<string, any>).firstName),
            lastName: String((ts.user as Record<string, any>).lastName),
            email: String((ts.user as Record<string, any>).email),
            role: String((ts.user as Record<string, any>).role)
        } : undefined,
    }))
}

export async function getTimesheetDetailByTeamLead(
    timesheetId: string
): Promise<Timesheet & { entries: TimesheetEntry[] }> {
    const ts: unknown = await api.get(`${TEAMLEAD_URL.timesheets}(${timesheetId})`, {
        $expand: 'entries($expand=project,task),currentApprover,user,approvalHistory($expand=actor)',
    })
    const data = ts as Record<string, any>

    // Map entries
    const entries = data.entries ? data.entries.map((e: any) => ({
        id: String(e.ID),
        date: String(e.date),
        hours: Number(e.loggedHours) || 0,
        approvedHours: e.approvedHours != null ? Number(e.approvedHours) : undefined,
        status: e.status as string,
        approverComment: e.approverComment as string | undefined,
        description: e.description as string | undefined,
        projectId: String(e.project_ID),
        projectName: e.project?.name || '',
        taskId: String(e.task_ID),
        taskName: e.task?.name || '',
    })) : []

    return {
        id: String(data.ID),
        month: Number(data.month),
        year: Number(data.year),
        status: data.status as TimesheetStatusType,
        entries,
        submitDate: data.submitDate as string | undefined,
        totalHours: entries.reduce((sum: number, e: TimesheetEntry) => sum + e.hours, 0),
        comment: data.comment as string | undefined,
        currentApprover: data.currentApprover ? {
            id: String(data.currentApprover.ID),
            firstName: String(data.currentApprover.firstName),
            lastName: String(data.currentApprover.lastName),
            role: String(data.currentApprover.role),
        } : undefined,
        user: data.user
            ? {
                id: String(data.user.ID),
                firstName: String(data.user.firstName),
                lastName: String(data.user.lastName),
                email: String(data.user.email),
                role: String(data.user.role),
            }
            : undefined,
    }
}

export async function getApprovedTimesheets(): Promise<Timesheet[]> {
    const data: unknown = await api.get(TEAMLEAD_URL.timesheets, {
        $filter: `status eq 'Approved' and batch_ID eq null`,
        $expand: 'user'
    })
    const list = (data && typeof data === 'object' && 'value' in data ? (data as any).value : data) as Record<string, unknown>[]
    return list.map((ts) => ({
        id: String(ts.ID),
        month: Number(ts.month),
        year: Number(ts.year),
        status: ts.status as TimesheetStatusType,
        entries: [],
        submitDate: ts.submitDate as string | undefined,
        approveDate: ts.approveDate as string | undefined,
        totalHours: 0,
        comment: ts.comment as string | undefined,
        user: ts.user ? {
            id: String((ts.user as Record<string, any>).ID),
            firstName: String((ts.user as Record<string, any>).firstName),
            lastName: String((ts.user as Record<string, any>).lastName),
            email: String((ts.user as Record<string, any>).email),
            role: String((ts.user as Record<string, any>).role)
        } : undefined,
    }))
}

export async function getTimesheetsByMonthYear(month: number, year: number): Promise<Timesheet[]> {
    const data: unknown = await api.get(TEAMLEAD_URL.timesheets, {
        $filter: `month eq ${month} and year eq ${year} and status ne 'Draft'`,
        $expand: 'user'
    })
    const list = (data && typeof data === 'object' && 'value' in data ? (data as any).value : data) as Record<string, unknown>[]
    return list.map((ts) => ({
        id: String(ts.ID || ts.id),
        month: Number(ts.month),
        year: Number(ts.year),
        status: ts.status as TimesheetStatusType,
        entries: [],
        submitDate: ts.submitDate as string | undefined,
        approveDate: ts.approveDate as string | undefined,
        totalHours: Number(ts.totalLoggedHours || ts.totalHours) || 0,
        comment: ts.comment as string | undefined,
        user: ts.user ? {
            id: String((ts.user as Record<string, any>).ID || (ts.user as Record<string, any>).id),
            firstName: String((ts.user as Record<string, any>).firstName),
            lastName: String((ts.user as Record<string, any>).lastName),
            email: String((ts.user as Record<string, any>).email),
            role: String((ts.user as Record<string, any>).role)
        } : undefined,
    }))
}

// ---------- Actions ----------

export async function approveTimesheetByTeamLead(timesheetId: string, comment?: string): Promise<string> {
    const data: unknown = await api.post(TEAMLEAD_URL.approve, { timesheetId, comment: comment || '' })
    return String((data && typeof data === 'object' && 'value' in data ? (data as any).value : data))
}

export async function rejectTimesheetByTeamLead(timesheetId: string, comment?: string): Promise<string> {
    const data: unknown = await api.post(TEAMLEAD_URL.reject, { timesheetId, comment: comment || '' })
    return String((data && typeof data === 'object' && 'value' in data ? (data as any).value : data))
}

export async function bulkApproveTimesheets(timesheetIds: string[], comment?: string): Promise<string> {
    const data: unknown = await api.post(TEAMLEAD_URL.bulkApprove, { timesheetIds, comment: comment || '' })
    return String((data && typeof data === 'object' && 'value' in data ? (data as any).value : data))
}

export async function bulkRejectTimesheets(timesheetIds: string[], comment?: string): Promise<string> {
    const data: unknown = await api.post(TEAMLEAD_URL.bulkReject, { timesheetIds, comment: comment || '' })
    return String((data && typeof data === 'object' && 'value' in data ? (data as any).value : data))
}

export async function modifyEntryHoursByTeamLead(entryId: string, approvedHours: number): Promise<string> {
    const data: unknown = await api.post(TEAMLEAD_URL.modifyEntryHours, { entryId, approvedHours })
    return String((data && typeof data === 'object' && 'value' in data ? (data as any).value : data))
}

export async function reviewEntryByTeamLead(entryId: string, status: string, approvedHours: number, approverComment: string): Promise<string> {
    const data: unknown = await api.post('/api/teamlead/reviewEntry', { entryId, status, approvedHours, approverComment })
    return String((data && typeof data === 'object' && 'value' in data ? (data as any).value : data))
}

export async function createBatch(timesheetIds: string[], adminId: string): Promise<string> {
    const data: unknown = await api.post(TEAMLEAD_URL.createBatch, { timesheetIds, adminId })
    return String((data && typeof data === 'object' && 'value' in data ? (data as any).value : data))
}
