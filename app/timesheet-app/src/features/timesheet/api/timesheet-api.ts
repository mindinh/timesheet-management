import { api } from '@/shared/api/http'
import { TIMESHEET_URL } from './timesheet-url'
import type {
    Timesheet,
    TimesheetEntry,
    TimesheetStatusType,
    ApprovalHistory,
} from '@/shared/types'

// ---------- Helpers ----------

function mapEntries(entries: Record<string, unknown>[]): TimesheetEntry[] {
    return entries.map((e) => ({
        id: String(e.ID),
        date: String(e.date),
        hours: Number(e.loggedHours) || 0,
        approvedHours: e.approvedHours != null ? Number(e.approvedHours) : undefined,
        description: e.description as string | undefined,
        projectId: String(e.project_ID),
        projectName: (e.project as Record<string, string>)?.name || '',
        taskId: String(e.task_ID),
        taskName: (e.task as Record<string, string>)?.name || '',
    }))
}

function mapApprovalHistory(history: Record<string, unknown>[]): ApprovalHistory[] {
    return history.map((h) => {
        const actor = h.actor as Record<string, string> | undefined
        return {
            id: String(h.ID),
            action: String(h.action),
            fromStatus: String(h.fromStatus),
            toStatus: String(h.toStatus),
            comment: h.comment as string | undefined,
            timestamp: String(h.timestamp || h.createdAt),
            actor: actor
                ? {
                    id: actor.ID,
                    firstName: actor.firstName,
                    lastName: actor.lastName,
                    role: actor.role,
                }
                : undefined,
        }
    })
}

function mapApprover(approver: Record<string, unknown> | null | undefined) {
    if (!approver) return undefined
    return {
        id: String(approver.ID),
        firstName: String(approver.firstName),
        lastName: String(approver.lastName),
        role: String(approver.role),
    }
}

// ---------- Queries ----------

export async function getAllTimesheets(userId: string): Promise<Timesheet[]> {
    const data: unknown = await api.get(TIMESHEET_URL.timesheets, {
        $filter: `user_ID eq ${userId}`,
        $orderby: 'year desc,month desc',
        $expand: 'entries,currentApprover',
    })
    const list = (data && typeof data === 'object' && 'value' in data ? (data as any).value : data) as Record<string, unknown>[]
    return list.map((ts) => {
        const entries = ts.entries ? mapEntries(ts.entries as Record<string, unknown>[]) : []
        return {
            id: String(ts.ID),
            month: Number(ts.month),
            year: Number(ts.year),
            status: ts.status as TimesheetStatusType,
            entries,
            submitDate: ts.submitDate as string | undefined,
            approveDate: ts.approveDate as string | undefined,
            totalHours: entries.reduce((sum: number, e: TimesheetEntry) => sum + e.hours, 0),
            comment: ts.comment as string | undefined,
            currentApprover: mapApprover(ts.currentApprover as Record<string, unknown> | undefined),
        }
    })
}

export async function getTimesheetByMonth(
    month: number,
    year: number,
    userId: string
): Promise<Timesheet | null> {
    const data: unknown = await api.get(TIMESHEET_URL.timesheets, {
        $filter: `month eq ${month} and year eq ${year} and user_ID eq ${userId}`,
        $expand: 'entries,currentApprover,approvalHistory($expand=actor)',
    })
    const list = (data && typeof data === 'object' && 'value' in data ? (data as any).value : data) as Record<string, unknown>[]
    if (list.length === 0) return null

    const ts = list[0]
    const entries = ts.entries ? mapEntries(ts.entries as Record<string, unknown>[]) : []
    const approvalHistory = ts.approvalHistory ? mapApprovalHistory(ts.approvalHistory as Record<string, unknown>[]) : []

    return {
        id: String(ts.ID),
        month: Number(ts.month),
        year: Number(ts.year),
        status: ts.status as TimesheetStatusType,
        entries,
        submitDate: ts.submitDate as string | undefined,
        approveDate: ts.approveDate as string | undefined,
        totalHours: entries.reduce((sum: number, e: TimesheetEntry) => sum + e.hours, 0),
        comment: ts.comment as string | undefined,
        approvalHistory,
        currentApprover: mapApprover(ts.currentApprover as Record<string, unknown> | undefined),
    }
}

export async function getTimesheetDetail(
    timesheetId: string
): Promise<Timesheet & { entries: TimesheetEntry[] }> {
    const ts: unknown = await api.get(TIMESHEET_URL.timesheetById(timesheetId), {
        $expand: 'entries($expand=project,task),currentApprover,user,approvalHistory($expand=actor)',
    })
    const data = ts as Record<string, any>
    const entries = data.entries ? mapEntries(data.entries) : []
    const approvalHistory = data.approvalHistory ? mapApprovalHistory(data.approvalHistory) : []

    return {
        id: String(data.ID),
        month: Number(data.month),
        year: Number(data.year),
        status: data.status as TimesheetStatusType,
        entries,
        submitDate: data.submitDate as string | undefined,
        approveDate: data.approveDate as string | undefined,
        finishedDate: data.finishedDate as string | undefined,
        totalHours: entries.reduce((sum: number, e: TimesheetEntry) => sum + e.hours, 0),
        comment: data.comment as string | undefined,
        approvalHistory,
        currentApprover: mapApprover(data.currentApprover as Record<string, unknown> | undefined),
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

export async function getApprovableTimesheets(): Promise<Timesheet[]> {
    const data: unknown = await api.get(TIMESHEET_URL.approvable)
    const list = (data && typeof data === 'object' && 'value' in data ? (data as any).value : data) as Record<string, unknown>[]
    return list.map((ts) => ({
        id: String(ts.id || ts.ID),
        month: Number(ts.month),
        year: Number(ts.year),
        status: ts.status as TimesheetStatusType,
        entries: [],
        submitDate: ts.submitDate as string | undefined,
        approveDate: ts.approveDate as string | undefined,
        finishedDate: ts.finishedDate as string | undefined,
        totalHours: Number(ts.totalHours) || 0,
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

// ---------- Commands ----------

export async function createTimesheet(
    timesheet: Omit<Timesheet, 'id' | 'entries'> & { user_ID: string }
): Promise<Timesheet> {
    const data: unknown = await api.post(TIMESHEET_URL.timesheets, {
        month: timesheet.month,
        year: timesheet.year,
        status: timesheet.status,
        user_ID: timesheet.user_ID,
    })
    const ts = data as Record<string, unknown>
    return {
        id: String(ts.ID),
        month: Number(ts.month),
        year: Number(ts.year),
        status: ts.status as TimesheetStatusType,
        entries: [],
    }
}

export async function submitTimesheet(timesheetId: string, approverId?: string): Promise<string> {
    const data: unknown = await api.post(TIMESHEET_URL.submit, { timesheetId, approverId })
    return String((data && typeof data === 'object' && 'value' in data ? (data as any).value : data))
}

export async function approveTimesheet(timesheetId: string, comment?: string): Promise<string> {
    const data: unknown = await api.post(TIMESHEET_URL.approve, { timesheetId, comment })
    return String((data && typeof data === 'object' && 'value' in data ? (data as any).value : data))
}

export async function rejectTimesheet(timesheetId: string, comment?: string): Promise<string> {
    const data: unknown = await api.post(TIMESHEET_URL.reject, { timesheetId, comment })
    return String((data && typeof data === 'object' && 'value' in data ? (data as any).value : data))
}

export async function finishTimesheet(timesheetId: string): Promise<string> {
    const data: unknown = await api.post(TIMESHEET_URL.finish, { timesheetId })
    return String((data && typeof data === 'object' && 'value' in data ? (data as any).value : data))
}

export async function submitToAdmin(timesheetId: string, adminId: string): Promise<string> {
    const data: unknown = await api.post(TIMESHEET_URL.submitToAdmin, { timesheetId, adminId })
    return String((data && typeof data === 'object' && 'value' in data ? (data as any).value : data))
}

export async function bulkSubmitToAdmin(timesheetIds: string[], adminId: string): Promise<string> {
    const data: unknown = await api.post(TIMESHEET_URL.bulkSubmitToAdmin, { timesheetIds, adminId })
    return String((data && typeof data === 'object' && 'value' in data ? (data as any).value : data))
}

export async function modifyEntryHours(entryId: string, approvedHours: number): Promise<string> {
    const data: unknown = await api.post(TIMESHEET_URL.modifyEntryHours, { entryId, approvedHours })
    return String((data && typeof data === 'object' && 'value' in data ? (data as any).value : data))
}

export async function exportToExcel(timesheetId: string): Promise<void> {
    const result: unknown = await api.post(
        TIMESHEET_URL.exportToExcel,
        { timesheetId },
        { responseType: 'blob' }
    )
    const res = result as { data: Blob; headers: Headers }
    // result = { data: Blob, headers: Headers } from httpClient.js
    const blob = res.data
    const headers = res.headers

    const disposition = headers?.get?.('content-disposition') || ''
    let fileName = 'timesheet.xlsx'
    if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/)
        if (match?.[1]) fileName = match[1]
    }

    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
}
