import { api } from '@/shared/api/http';
import { PROJECT_URL } from './project-url';
import type { Project } from '@/shared/types';

// ---------- Helpers ----------

function mapProject(p: Record<string, unknown>): Project {
  return {
    id: String(p.ID),
    name: String(p.name),
    code: String(p.code),
    type: (p.type as Project['type']) || 'Other',
    description: (p.description as string) || '',
    isActive: Boolean(p.isActive),
  };
}

// ---------- CRUD ----------

export async function getAllProjects(): Promise<Project[]> {
  const data: unknown = await api.get(PROJECT_URL.projects);
  const list = (
    data && typeof data === 'object' && 'value' in data ? (data as Record<string, unknown>).value : data
  ) as Record<string, unknown>[];
  return list.map(mapProject);
}

export async function getProjectsByUser(_userId: string): Promise<Project[]> {
  return getAllProjects(); // backward compat — now all projects are shared
}

export async function createProject(project: Omit<Project, 'id'>): Promise<Project | null> {
  const data: unknown = await api.post(PROJECT_URL.projects, {
    name: project.name,
    code: project.code,
    type: project.type || 'Other',
    description: project.description || '',
    isActive: project.isActive,
  });
  return data ? mapProject(data as Record<string, unknown>) : null;
}

export async function updateProject(id: string, project: Partial<Project>): Promise<Project> {
  const payload: Record<string, unknown> = {};
  if (project.name !== undefined) payload.name = project.name;
  if (project.code !== undefined) payload.code = project.code;
  if (project.type !== undefined) payload.type = project.type;
  if (project.description !== undefined) payload.description = project.description;
  if (project.isActive !== undefined) payload.isActive = project.isActive;

  const data: unknown = await api.patch(PROJECT_URL.projectById(id), payload);
  return mapProject(data as Record<string, unknown>);
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(PROJECT_URL.projectById(id));
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

export interface ProjectAuditEntry {
  id: string;
  entity_: string;
  entityId: string;
  action: string;
  actor?: { id: string; firstName: string; lastName: string };
  changes?: string;
  timestamp: string;
}

export async function getProjectAuditLog(projectId?: string): Promise<ProjectAuditEntry[]> {
  const params: Record<string, string> = {
    $expand: 'actor',
    $orderby: 'timestamp desc',
  };
  if (projectId) params['$filter'] = `project_ID eq ${projectId}`;
  const data: unknown = await api.get('/api/timesheet/ProjectAuditLogs', params);
  const list = (data && typeof data === 'object' && 'value' in data ? (data as any).value : data) as Record<
    string,
    any
  >[];
  return list.map((r) => ({
    id: String(r.ID),
    entity_: String(r.entity_),
    entityId: String(r.entityId),
    action: String(r.action),
    actor: r.actor
      ? {
          id: String(r.actor.ID),
          firstName: String(r.actor.firstName),
          lastName: String(r.actor.lastName),
        }
      : undefined,
    changes: r.changes as string | undefined,
    timestamp: String(r.timestamp),
  }));
}
