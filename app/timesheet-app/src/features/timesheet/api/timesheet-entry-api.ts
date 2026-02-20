import { api } from '@/shared/api/http'
import { TIMESHEET_ENTRY_URL } from './timesheet-entry-url'
import type { TimesheetEntry } from '@/shared/types'

// ---------- Helpers ----------

function mapEntry(e: any): TimesheetEntry {
    return {
        id: e.ID,
        date: e.date,
        hours: Number(e.loggedHours) || 0,
        description: e.description,
        projectId: e.project_ID,
        taskId: e.task_ID,
    }
}

// ---------- CRUD ----------

export async function getEntries(
    month: number,
    year: number,
    userId: string
): Promise<TimesheetEntry[]> {
    const data: any = await api.get(TIMESHEET_ENTRY_URL.entries, {
        $filter: `month(date) eq ${month} and year(date) eq ${year} and timesheet/user_ID eq ${userId}`,
    })
    const list = data.value || data
    return list.map(mapEntry)
}

export async function createEntry(
    entry: Omit<TimesheetEntry, 'id'> & { timesheetId: string }
): Promise<TimesheetEntry> {
    const data: any = await api.post(TIMESHEET_ENTRY_URL.entries, {
        date: entry.date,
        loggedHours: entry.hours,
        description: entry.description,
        project_ID: entry.projectId,
        task_ID: entry.taskId || null,
        timesheet_ID: entry.timesheetId,
    })
    return mapEntry(data)
}

export async function updateEntry(
    id: string,
    entry: Partial<TimesheetEntry>
): Promise<TimesheetEntry> {
    const payload: any = {}
    if (entry.date) payload.date = entry.date
    if (entry.hours !== undefined) payload.loggedHours = entry.hours
    if (entry.description !== undefined) payload.description = entry.description
    if (entry.projectId) payload.project_ID = entry.projectId
    if (entry.taskId !== undefined) payload.task_ID = entry.taskId || null

    const data: any = await api.patch(TIMESHEET_ENTRY_URL.entryById(id), payload)
    return mapEntry(data)
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
