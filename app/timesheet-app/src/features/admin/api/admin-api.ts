import { api } from '@/shared/api/http'
import { ADMIN_URL } from './admin-url'

export interface DashboardStats {
    overtimeUsers: {
        user: {
            ID: string
            firstName: string
            lastName: string
            email: string
        }
        otHours: number
    }[]
    missingTimesheetUsers: {
        ID: string
        firstName: string
        lastName: string
        email: string
    }[]
    recentActivity: {
        id: string
        type: 'Batch' | 'Timesheet'
        action: string
        message: string
        timestamp: string
        actorName: string
        referenceId: string
    }[]
    timesheetStatusChart: {
        name: string
        value: number
    }[]
    monthlyHoursTrend: {
        name: string
        hours: number
    }[]
    projectHoursChart: {
        name: string
        value: number
    }[]
    topEmployeesChart: {
        name: string
        hours: number
        email?: string
    }[]
}

export interface TimesheetBatch {
    ID: string
    status: string
    createdAt: string
    teamLead: {
        ID: string
        firstName: string
        lastName: string
        email: string
    }
    timesheets: {
        ID: string
        status: string
    }[]
}

export interface TimesheetBatchDetail extends TimesheetBatch {
    history?: {
        ID: string
        action: string
        status: string
        comment: string
        timestamp: string
        actor: {
            ID: string
            firstName: string
            lastName: string
        }
    }[]
    timesheets: ({
        ID: string
        status: string
        month: number
        year: number
        user: {
            ID: string
            firstName: string
            lastName: string
        }
        approvalHistory?: {
            ID: string
            action: string
            comment: string
            timestamp: string
            fromStatus: string
            toStatus: string
            actor: {
                ID: string
                firstName: string
                lastName: string
            }
        }[]
    })[]
}

export interface ExportLog {
    ID: string
    exportedBy_ID: string
    exportDate: string
    fromDate: string | null
    toDate: string | null
    userId: string | null
    projectId: string | null
    totalEntries: number
    filePath: string | null
    filters: string
}

// ── Export History ────────────────────────────────────────────────────────
export async function fetchExportLogs(): Promise<ExportLog[]> {
    const data: unknown = await api.get(ADMIN_URL.exportLogs, {
        $orderby: 'exportDate desc'
    })
    return (data as { value: ExportLog[] }).value || (data as ExportLog[])
}

// ── Batch Submissions ──────────────────────────────────────────────────
export async function fetchTimesheetBatches(): Promise<TimesheetBatch[]> {
    const data: unknown = await api.get(ADMIN_URL.timesheetBatches, {
        $expand: 'teamLead($select=ID,firstName,lastName,email),timesheets($select=ID,status)',
        $orderby: 'createdAt desc'
    })
    return (data as { value: TimesheetBatch[] }).value || (data as TimesheetBatch[])
}

export async function fetchTimesheetBatchById(id: string): Promise<TimesheetBatchDetail> {
    const data: unknown = await api.get(`${ADMIN_URL.timesheetBatches}('${id}')`, {
        $expand: 'teamLead($select=ID,firstName,lastName,email),history($expand=actor($select=ID,firstName,lastName);$orderby=timestamp desc),timesheets($expand=user($select=ID,firstName,lastName),approvalHistory($expand=actor($select=ID,firstName,lastName);$orderby=timestamp desc);$select=ID,status,month,year)'
    })
    return (data as { value: TimesheetBatchDetail }).value || (data as TimesheetBatchDetail)
}

// ── Admin Export (Excel) ──────────────────────────────────────────────────
export async function triggerExportToExcel(params: {
    year: number
    month?: number
    userId?: string | null
    projectId?: string | null
    from?: string | null
    to?: string | null
}): Promise<void> {

    // Call the action with { responseType: 'blob' } to handle the binary Excel file
    const blob: unknown = await api.post(ADMIN_URL.exportToExcel, params, {
        responseType: 'blob'
    })

    // Create a temporary link to download the blob
    const url = window.URL.createObjectURL(blob as Blob)
    const link = document.createElement('a')
    link.href = url

    // Construct a sensible filename
    let filename = `Timesheet_Export_${params.year}`
    if (params.month) filename += `_${params.month}`
    filename += '.xlsx'

    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()

    // Cleanup
    link.remove()
    window.URL.revokeObjectURL(url)
}

// ── Send Email ────────────────────────────────────────────────────────────
export async function sendEmailToGermany(exportId?: string | null, recipientEmail?: string): Promise<string> {
    const data: unknown = await api.post(ADMIN_URL.sendEmailToGermany, {
        exportId,
        recipientEmail
    })
    return (data as { value: string }).value || (data as string)
}

// ── Sync Papierkram Projects ──────────────────────────────────────────────
export async function syncProjects(): Promise<string> {
    const data: unknown = await api.post(ADMIN_URL.syncProjects, {})
    return (data as { value: string }).value || (data as string)
}

// ── Modify Entry Hours ────────────────────────────────────────────────────
export async function adminModifyEntryHours(entryId: string, approvedHours: number, note?: string): Promise<string> {
    const data: unknown = await api.post(ADMIN_URL.adminModifyEntryHours, {
        entryId,
        approvedHours,
        note
    })
    return (data as { value: string }).value || (data as string)
}

// ── Batch Actions ────────────────────────────────────────────────────────
export async function markBatchDoneApi(batchId: string): Promise<string> {
    const data: unknown = await api.post(`${ADMIN_URL.base}/markBatchDone`, {
        batchId
    })
    return (data as { value: string }).value || (data as string)
}

export async function rejectBatchApi(batchId: string, comment: string): Promise<string> {
    const data: unknown = await api.post(`${ADMIN_URL.base}/rejectBatch`, {
        batchId,
        comment
    })
    return (data as { value: string }).value || (data as string)
}

// ── Dashboard Statistics ─────────────────────────────────────────────────
export async function fetchDashboardStats(month: number, year: number): Promise<DashboardStats> {
    const data: unknown = await api.post(`${ADMIN_URL.base}/getDashboardStats`, {
        month,
        year
    })
    // The backend returns a JSON string that we must parse
    const dataValue = (data as { value: unknown }).value || data
    const parsedData = typeof dataValue === 'string' ? JSON.parse(dataValue) : dataValue
    return parsedData as DashboardStats
}
