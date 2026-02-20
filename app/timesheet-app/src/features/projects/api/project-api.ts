import { api } from '@/shared/api/http'
import { PROJECT_URL } from './project-url'
import type { Project } from '@/shared/types'

// ---------- Helpers ----------

function mapProject(p: any): Project {
    return {
        id: p.ID,
        name: p.name,
        code: p.code,
        type: p.type || 'Other',
        description: p.description || '',
        isActive: p.isActive,
    }
}

// ---------- CRUD ----------

export async function getAllProjects(): Promise<Project[]> {
    const data: any = await api.get(PROJECT_URL.projects)
    const list = data.value || data
    return list.map(mapProject)
}

export async function getProjectsByUser(userId: string): Promise<Project[]> {
    const data: any = await api.get(PROJECT_URL.projects, {
        $filter: `user_ID eq ${userId}`,
    })
    const list = data.value || data
    return list.map(mapProject)
}

export async function createProject(
    project: Omit<Project, 'id'> & { user_ID?: string }
): Promise<Project> {
    const data: any = await api.post(PROJECT_URL.projects, {
        name: project.name,
        code: project.code,
        type: project.type || 'Other',
        description: project.description || '',
        isActive: project.isActive,
        ...(project.user_ID && { user_ID: project.user_ID }),
    })
    return mapProject(data)
}

export async function updateProject(id: string, project: Partial<Project>): Promise<Project> {
    const payload: any = {}
    if (project.name !== undefined) payload.name = project.name
    if (project.code !== undefined) payload.code = project.code
    if (project.type !== undefined) payload.type = project.type
    if (project.description !== undefined) payload.description = project.description
    if (project.isActive !== undefined) payload.isActive = project.isActive

    const data: any = await api.patch(PROJECT_URL.projectById(id), payload)
    return mapProject(data)
}

export async function deleteProject(id: string): Promise<void> {
    await api.delete(PROJECT_URL.projectById(id))
}
