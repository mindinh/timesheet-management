import { api } from '@/shared/api/http'
import { TASK_URL } from './task-url'
import type { Task } from '@/shared/types'

// ---------- Helpers ----------

function mapTask(t: Record<string, unknown>): Task {
    return {
        id: String(t.ID),
        projectId: String(t.project_ID),
        name: String(t.name),
        description: (t.description as string) || '',
        startDate: String(t.startDate),
        endDate: String(t.endDate),
        status: (t.status as Task['status']) || 'Open',
    }
}

// ---------- CRUD ----------

export async function getTasksByProject(projectId: string): Promise<Task[]> {
    const data: unknown = await api.get(TASK_URL.tasks, {
        $filter: `project_ID eq ${projectId}`,
    })
    const list = (data && typeof data === 'object' && 'value' in data ? (data as Record<string, unknown>).value : data) as Record<string, unknown>[]
    return list.map((t) => mapTask(t as Record<string, unknown>))
}

export async function createTask(task: Omit<Task, 'id'>): Promise<Task> {
    const data: unknown = await api.post(TASK_URL.tasks, {
        project_ID: task.projectId,
        name: task.name,
        description: task.description || '',
        startDate: task.startDate,
        endDate: task.endDate,
        status: task.status || 'Open',
    })
    return mapTask(data as Record<string, unknown>)
}

export async function updateTask(id: string, task: Partial<Task>): Promise<Task> {
    const payload: Record<string, unknown> = {}
    if (task.name !== undefined) payload.name = task.name
    if (task.description !== undefined) payload.description = task.description
    if (task.startDate !== undefined) payload.startDate = task.startDate
    if (task.endDate !== undefined) payload.endDate = task.endDate
    if (task.status !== undefined) payload.status = task.status

    const data: unknown = await api.patch(TASK_URL.taskById(id), payload)
    return mapTask(data as Record<string, unknown>)
}

export async function deleteTask(id: string): Promise<void> {
    await api.delete(TASK_URL.taskById(id))
}
