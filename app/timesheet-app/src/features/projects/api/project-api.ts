import { api } from '@/shared/api/http'
import { PROJECT_URL } from './project-url'
import type { Project } from '@/shared/types'

// ---------- Helpers ----------

function mapProject(p: Record<string, unknown>): Project {
    return {
        id: String(p.ID),
        name: String(p.name),
        code: String(p.code),
        type: (p.type as Project['type']) || 'Other',
        description: (p.description as string) || '',
        isActive: Boolean(p.isActive),
    }
}

// ---------- CRUD ----------

export async function getAllProjects(): Promise<Project[]> {
    const data: unknown = await api.get(PROJECT_URL.projects)
    const list = (data && typeof data === 'object' && 'value' in data ? (data as Record<string, unknown>).value : data) as Record<string, unknown>[]
    return list.map(mapProject)
}

export async function getProjectsByUser(userId: string): Promise<Project[]> {
    const data: unknown = await api.get(PROJECT_URL.projects, {
        $filter: `user_ID eq ${userId}`,
    })
    const list = (data && typeof data === 'object' && 'value' in data ? (data as Record<string, unknown>).value : data) as Record<string, unknown>[]
    return list.map(mapProject)
}

export async function createProject(
    project: Omit<Project, 'id'> & { user_ID?: string }
): Promise<Project | null> {
    const data: unknown = await api.post(PROJECT_URL.projects, {
        name: project.name,
        code: project.code,
        type: project.type || 'Other',
        description: project.description || '',
        isActive: project.isActive,
        ...(project.user_ID && { user_ID: project.user_ID }),
    })
    return data ? mapProject(data as Record<string, unknown>) : null
}

export async function updateProject(id: string, project: Partial<Project>): Promise<Project> {
    const payload: Record<string, unknown> = {}
    if (project.name !== undefined) payload.name = project.name
    if (project.code !== undefined) payload.code = project.code
    if (project.type !== undefined) payload.type = project.type
    if (project.description !== undefined) payload.description = project.description
    if (project.isActive !== undefined) payload.isActive = project.isActive

    const data: unknown = await api.patch(PROJECT_URL.projectById(id), payload)
    return mapProject(data as Record<string, unknown>)
}

export async function deleteProject(id: string): Promise<void> {
    await api.delete(PROJECT_URL.projectById(id))
}
