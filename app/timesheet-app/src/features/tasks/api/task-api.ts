import { api } from '@/shared/api/http'
import { TASK_URL } from './task-url'
import type { Task } from '@/shared/types'

// ---------- Helpers ----------

function mapTask(t: any): Task {
    return {
        id: t.ID,
        projectId: t.project_ID,
        name: t.name,
        description: t.description || '',
        startDate: t.startDate,
        endDate: t.endDate,
        status: t.status || 'Open',
    }
}

// ---------- CRUD ----------

export async function getTasksByProject(projectId: string): Promise<Task[]> {
    const data: any = await api.get(TASK_URL.tasks, {
        $filter: `project_ID eq ${projectId}`,
    })
    const list = data.value || data
    return list.map(mapTask)
}

export async function createTask(task: Omit<Task, 'id'>): Promise<Task> {
    const data: any = await api.post(TASK_URL.tasks, {
        project_ID: task.projectId,
        name: task.name,
        description: task.description || '',
        startDate: task.startDate,
        endDate: task.endDate,
        status: task.status || 'Open',
    })
    return mapTask(data)
}

export async function updateTask(id: string, task: Partial<Task>): Promise<Task> {
    const payload: any = {}
    if (task.name !== undefined) payload.name = task.name
    if (task.description !== undefined) payload.description = task.description
    if (task.startDate !== undefined) payload.startDate = task.startDate
    if (task.endDate !== undefined) payload.endDate = task.endDate
    if (task.status !== undefined) payload.status = task.status

    const data: any = await api.patch(TASK_URL.taskById(id), payload)
    return mapTask(data)
}

export async function deleteTask(id: string): Promise<void> {
    await api.delete(TASK_URL.taskById(id))
}
