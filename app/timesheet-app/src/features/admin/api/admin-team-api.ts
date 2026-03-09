import { api } from '@/shared/api/http';

const ADMIN_URL = '/admin';

export interface TeamGroup {
  teamLeadId: string;
  firstName: string;
  lastName: string;
  email: string;
  adminId: string | null;
  members: { id: string; firstName: string; lastName: string; email: string; role: string }[];
}

export interface TeamLeadUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  members?: { id: string; firstName: string; lastName: string; email: string }[];
}

export async function getAllTeams(): Promise<TeamGroup[]> {
  const data: unknown = await api.post(`${ADMIN_URL}/getAllTeams`, {});
  const raw = data && typeof data === 'object' && 'value' in data ? (data as any).value : data;
  return JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw));
}

export async function getUnassignedTeamLeads(): Promise<TeamLeadUser[]> {
  const data: unknown = await api.post(`${ADMIN_URL}/getUnassignedTeamLeads`, {});
  const raw = data && typeof data === 'object' && 'value' in data ? (data as any).value : data;
  return JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw));
}

export async function adminAssignTeamLead(teamLeadId: string): Promise<string> {
  const data: unknown = await api.post(`${ADMIN_URL}/adminAssignTeamLead`, { teamLeadId });
  return String(data && typeof data === 'object' && 'value' in data ? (data as any).value : data);
}

export async function adminUnassignTeamLead(teamLeadId: string): Promise<string> {
  const data: unknown = await api.post(`${ADMIN_URL}/adminUnassignTeamLead`, { teamLeadId });
  return String(data && typeof data === 'object' && 'value' in data ? (data as any).value : data);
}
