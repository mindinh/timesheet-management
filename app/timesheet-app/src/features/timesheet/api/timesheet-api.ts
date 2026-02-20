import { api } from '@/shared/api/http'
import { TIMESHEET_URL } from './timesheet-url'
import type {
    Timesheet,
    TimesheetEntry,
    TimesheetStatusType,
    ApprovalHistory,
} from '@/shared/types'

// ---------- Helpers ----------

function mapEntries(entries: any[]): TimesheetEntry[] {
    return entries.map((e: any) => ({
        id: e.ID,
        date: e.date,
        hours: Number(e.loggedHours) || 0,
        approvedHours: e.approvedHours != null ? Number(e.approvedHours) : undefined,
        description: e.description,
        projectId: e.project_ID,
        projectName: e.project?.name || '',
        taskId: e.task_ID,
        taskName: e.task?.name || '',
    }))
}

function mapApprovalHistory(history: any[]): ApprovalHistory[] {
    return history.map((h: any) => ({
        id: h.ID,
        action: h.action,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        comment: h.comment,
        timestamp: h.timestamp || h.createdAt,
        actor: h.actor
            ? {
                id: h.actor.ID,
                firstName: h.actor.firstName,
                lastName: h.actor.lastName,
                role: h.actor.role,
            }
            : undefined,
    }))
}

function mapApprover(approver: any) {
    if (!approver) return undefined
    return {
        id: approver.ID,
        firstName: approver.firstName,
        lastName: approver.lastName,
        role: approver.role,
    }
}

// ---------- Queries ----------

export async function getAllTimesheets(userId: string): Promise<Timesheet[]> {
    const data: any = await api.get(TIMESHEET_URL.timesheets, {
        $filter: `user_ID eq ${userId}`,
        $orderby: 'year desc,month desc',
        $expand: 'entries,currentApprover',
    })
    const list = data.value || data
    return list.map((ts: any) => {
        const entries = ts.entries ? mapEntries(ts.entries) : []
        return {
            id: ts.ID,
            month: ts.month,
            year: ts.year,
            status: ts.status as TimesheetStatusType,
            entries,
            submitDate: ts.submitDate,
            approveDate: ts.approveDate,
            totalHours: entries.reduce((sum: number, e: TimesheetEntry) => sum + e.hours, 0),
            comment: ts.comment,
            currentApprover: mapApprover(ts.currentApprover),
        }
    })
}

export async function getTimesheetByMonth(
    month: number,
    year: number,
    userId: string
): Promise<Timesheet | null> {
    const data: any = await api.get(TIMESHEET_URL.timesheets, {
        $filter: `month eq ${month} and year eq ${year} and user_ID eq ${userId}`,
        $expand: 'entries,currentApprover,approvalHistory($expand=actor)',
    })
    const list = data.value || data
    if (list.length === 0) return null

    const ts = list[0]
    const entries = ts.entries ? mapEntries(ts.entries) : []
    const approvalHistory = ts.approvalHistory ? mapApprovalHistory(ts.approvalHistory) : []

    return {
        id: ts.ID,
        month: ts.month,
        year: ts.year,
        status: ts.status as TimesheetStatusType,
        entries,
        submitDate: ts.submitDate,
        approveDate: ts.approveDate,
        totalHours: entries.reduce((sum: number, e: TimesheetEntry) => sum + e.hours, 0),
        comment: ts.comment,
        approvalHistory,
        currentApprover: mapApprover(ts.currentApprover),
    }
}

export async function getTimesheetDetail(
    timesheetId: string
): Promise<Timesheet & { entries: TimesheetEntry[] }> {
    const ts: any = await api.get(TIMESHEET_URL.timesheetById(timesheetId), {
        $expand: 'entries($expand=project,task),currentApprover,user,approvalHistory($expand=actor)',
    })
    const entries = ts.entries ? mapEntries(ts.entries) : []
    const approvalHistory = ts.approvalHistory ? mapApprovalHistory(ts.approvalHistory) : []

    return {
        id: ts.ID,
        month: ts.month,
        year: ts.year,
        status: ts.status as TimesheetStatusType,
        entries,
        submitDate: ts.submitDate,
        approveDate: ts.approveDate,
        finishedDate: ts.finishedDate,
        totalHours: entries.reduce((sum: number, e: TimesheetEntry) => sum + e.hours, 0),
        comment: ts.comment,
        approvalHistory,
        currentApprover: mapApprover(ts.currentApprover),
        user: ts.user
            ? {
                id: ts.user.ID,
                firstName: ts.user.firstName,
                lastName: ts.user.lastName,
                email: ts.user.email,
                role: ts.user.role,
            }
            : undefined,
    }
}

export async function getApprovableTimesheets(): Promise<Timesheet[]> {
    const data: any = await api.get(TIMESHEET_URL.approvable)
    const list = data.value || data
    return list.map((ts: any) => ({
        id: ts.id || ts.ID,
        month: ts.month,
        year: ts.year,
        status: ts.status as TimesheetStatusType,
        entries: [],
        submitDate: ts.submitDate,
        approveDate: ts.approveDate,
        finishedDate: ts.finishedDate,
        totalHours: ts.totalHours || 0,
        comment: ts.comment,
        user: ts.user || undefined,
    }))
}

// ---------- Commands ----------

export async function createTimesheet(
    timesheet: Omit<Timesheet, 'id' | 'entries'> & { user_ID: string }
): Promise<Timesheet> {
    const data: any = await api.post(TIMESHEET_URL.timesheets, {
        month: timesheet.month,
        year: timesheet.year,
        status: timesheet.status,
        user_ID: timesheet.user_ID,
    })
    return {
        id: data.ID,
        month: data.month,
        year: data.year,
        status: data.status as TimesheetStatusType,
        entries: [],
    }
}

export async function submitTimesheet(timesheetId: string, approverId?: string): Promise<string> {
    const data: any = await api.post(TIMESHEET_URL.submit, { timesheetId, approverId })
    return data.value || data
}

export async function approveTimesheet(timesheetId: string, comment?: string): Promise<string> {
    const data: any = await api.post(TIMESHEET_URL.approve, { timesheetId, comment })
    return data.value || data
}

export async function rejectTimesheet(timesheetId: string, comment?: string): Promise<string> {
    const data: any = await api.post(TIMESHEET_URL.reject, { timesheetId, comment })
    return data.value || data
}

export async function finishTimesheet(timesheetId: string): Promise<string> {
    const data: any = await api.post(TIMESHEET_URL.finish, { timesheetId })
    return data.value || data
}

export async function submitToAdmin(timesheetId: string, adminId: string): Promise<string> {
    const data: any = await api.post(TIMESHEET_URL.submitToAdmin, { timesheetId, adminId })
    return data.value || data
}

export async function modifyEntryHours(entryId: string, approvedHours: number): Promise<string> {
    const data: any = await api.post(TIMESHEET_URL.modifyEntryHours, { entryId, approvedHours })
    return data.value || data
}

export async function exportToExcel(timesheetId: string): Promise<void> {
    const result: any = await api.post(
        TIMESHEET_URL.exportToExcel,
        { timesheetId },
        { responseType: 'blob' }
    )
    // result = { data: Blob, headers: Headers } from httpClient.js
    const blob = result.data
    const headers = result.headers

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
