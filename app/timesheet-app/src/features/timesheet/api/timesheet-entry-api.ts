import { api } from '@/shared/api/http'
import { TIMESHEET_ENTRY_URL } from './timesheet-entry-url'
import type { TimesheetEntry } from '@/shared/types'

// ---------- Helpers ----------

function mapEntry(e: Record<string, unknown>): TimesheetEntry {
    return {
        id: String(e.ID),
        date: String(e.date),
        hours: Number(e.loggedHours) || 0,
        description: e.description as string | undefined,
        projectId: String(e.project_ID),
        taskId: String(e.task_ID),
    }
}

// ---------- CRUD ----------

export async function getEntries(
    month: number,
    year: number,
    userId: string
): Promise<TimesheetEntry[]> {
    const data: unknown = await api.get(TIMESHEET_ENTRY_URL.entries, {
        $filter: `month(date) eq ${month} and year(date) eq ${year} and timesheet/user_ID eq ${userId}`,
    })
    const list = (data && typeof data === 'object' && 'value' in data ? (data as any).value : data) as Record<string, unknown>[]
    return list.map(mapEntry)
}

export async function createEntry(
    entry: Omit<TimesheetEntry, 'id'> & { timesheetId: string }
): Promise<TimesheetEntry> {
    const data: unknown = await api.post(TIMESHEET_ENTRY_URL.entries, {
        date: entry.date,
        loggedHours: entry.hours,
        description: entry.description,
        project_ID: entry.projectId,
        task_ID: entry.taskId || null,
        timesheet_ID: entry.timesheetId,
    })
    return mapEntry(data as Record<string, unknown>)
}

export async function updateEntry(
    id: string,
    entry: Partial<TimesheetEntry>
): Promise<TimesheetEntry> {
    const payload: Record<string, unknown> = {}
    if (entry.date) payload.date = entry.date
    if (entry.hours !== undefined) payload.loggedHours = entry.hours
    if (entry.description !== undefined) payload.description = entry.description
    if (entry.projectId) payload.project_ID = entry.projectId
    if (entry.taskId !== undefined) payload.task_ID = entry.taskId || null

    const data: unknown = await api.patch(TIMESHEET_ENTRY_URL.entryById(id), payload)
    return mapEntry(data as Record<string, unknown>)
}

export async function deleteEntry(id: string): Promise<void> {
    await api.delete(TIMESHEET_ENTRY_URL.entryById(id))
}

export async function bulkSaveEntries(
    entries: (TimesheetEntry & { timesheetId: string })[]
): Promise<void> {
    const promises = entries.map((entry) => {
        if (entry.id.startsWith('local-')) {
            return createEntry(entry)
        } else {
            return updateEntry(entry.id, entry)
        }
    })
    await Promise.all(promises)
}
