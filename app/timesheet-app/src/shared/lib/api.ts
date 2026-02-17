import axios from 'axios'
import type { Project, TimesheetEntry, Timesheet, Task, TimesheetStatusType, ApprovalHistory } from '@/shared/types'

// Mock user impersonation support
let _mockUserId: string | null = null

export function setMockUserId(userId: string | null) {
    _mockUserId = userId
}

export function getMockUserId(): string | null {
    return _mockUserId
}

const api = axios.create({
    baseURL: '/api/timesheet',
    headers: {
        'Content-Type': 'application/json',
    },
    paramsSerializer: (params) => {
        return Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
            .join('&')
    },
})

// Inject x-mock-user header when impersonating a user
api.interceptors.request.use((config) => {
    if (_mockUserId) {
        config.headers['x-mock-user'] = _mockUserId
    }
    return config
})

// Projects API
export const projectsAPI = {
    getAll: async (): Promise<Project[]> => {
        const response = await api.get('/Projects')
        const data = response.data.value || response.data
        return data.map((p: any) => ({
            id: p.ID,
            name: p.name,
            code: p.code,
            type: p.type || 'Other',
            description: p.description || '',
            isActive: p.isActive,
        }))
    },

    getProjectsByUser: async (userId: string): Promise<Project[]> => {
        const response = await api.get('/Projects', {
            params: {
                $filter: `user_ID eq ${userId}`,
            },
        })
        const data = response.data.value || response.data
        return data.map((p: any) => ({
            id: p.ID,
            name: p.name,
            code: p.code,
            type: p.type || 'Other',
            description: p.description || '',
            isActive: p.isActive,
        }))
    },

    create: async (project: Omit<Project, 'id'> & { user_ID?: string }): Promise<Project> => {
        const response = await api.post('/Projects', {
            name: project.name,
            code: project.code,
            type: project.type || 'Other',
            description: project.description || '',
            isActive: project.isActive,
            ...(project.user_ID && { user_ID: project.user_ID }),
        })
        return {
            id: response.data.ID,
            name: response.data.name,
            code: response.data.code,
            type: response.data.type || 'Other',
            description: response.data.description || '',
            isActive: response.data.isActive,
        }
    },

    update: async (id: string, project: Partial<Project>): Promise<Project> => {
        const payload: any = {}
        if (project.name !== undefined) payload.name = project.name
        if (project.code !== undefined) payload.code = project.code
        if (project.type !== undefined) payload.type = project.type
        if (project.description !== undefined) payload.description = project.description
        if (project.isActive !== undefined) payload.isActive = project.isActive

        const response = await api.patch(`/Projects(${id})`, payload)
        return {
            id: response.data.ID,
            name: response.data.name,
            code: response.data.code,
            type: response.data.type || 'Other',
            description: response.data.description || '',
            isActive: response.data.isActive,
        }
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/Projects(${id})`)
    },
}

// Tasks API
export const tasksAPI = {
    getByProject: async (projectId: string): Promise<Task[]> => {
        const response = await api.get('/Tasks', {
            params: {
                $filter: `project_ID eq ${projectId}`,
            },
        })
        const data = response.data.value || response.data
        return data.map((t: any) => ({
            id: t.ID,
            projectId: t.project_ID,
            name: t.name,
            description: t.description || '',
            startDate: t.startDate,
            endDate: t.endDate,
            status: t.status || 'Open',
        }))
    },

    create: async (task: Omit<Task, 'id'>): Promise<Task> => {
        const response = await api.post('/Tasks', {
            project_ID: task.projectId,
            name: task.name,
            description: task.description || '',
            startDate: task.startDate,
            endDate: task.endDate,
            status: task.status || 'Open',
        })
        return {
            id: response.data.ID,
            projectId: response.data.project_ID,
            name: response.data.name,
            description: response.data.description || '',
            startDate: response.data.startDate,
            endDate: response.data.endDate,
            status: response.data.status || 'Open',
        }
    },

    update: async (id: string, task: Partial<Task>): Promise<Task> => {
        const payload: any = {}
        if (task.name !== undefined) payload.name = task.name
        if (task.description !== undefined) payload.description = task.description
        if (task.startDate !== undefined) payload.startDate = task.startDate
        if (task.endDate !== undefined) payload.endDate = task.endDate
        if (task.status !== undefined) payload.status = task.status

        const response = await api.patch(`/Tasks(${id})`, payload)
        return {
            id: response.data.ID,
            projectId: response.data.project_ID,
            name: response.data.name,
            description: response.data.description || '',
            startDate: response.data.startDate,
            endDate: response.data.endDate,
            status: response.data.status || 'Open',
        }
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/Tasks(${id})`)
    },
}

// Timesheets API
export const timesheetsAPI = {
    getAll: async (userId: string): Promise<Timesheet[]> => {
        const response = await api.get('/Timesheets', {
            params: {
                $filter: `user_ID eq ${userId}`,
                $orderby: 'year desc,month desc',
                $expand: 'entries,currentApprover',
            },
        })
        const data = response.data.value || response.data
        return data.map((ts: any) => {
            const entries = ts.entries ? ts.entries.map((e: any) => ({
                id: e.ID,
                date: e.date,
                hours: Number(e.loggedHours) || 0,
                description: e.description,
                projectId: e.project_ID,
                taskId: e.task_ID,
            })) : []
            const totalHours = entries.reduce((sum: number, e: any) => sum + e.hours, 0)
            return {
                id: ts.ID,
                month: ts.month,
                year: ts.year,
                status: ts.status as TimesheetStatusType,
                entries,
                submitDate: ts.submitDate,
                approveDate: ts.approveDate,
                totalHours,
                comment: ts.comment,
                currentApprover: ts.currentApprover ? {
                    id: ts.currentApprover.ID,
                    firstName: ts.currentApprover.firstName,
                    lastName: ts.currentApprover.lastName,
                    role: ts.currentApprover.role,
                } : undefined,
            }
        })
    },

    getByMonth: async (month: number, year: number, userId: string): Promise<Timesheet | null> => {
        const response = await api.get('/Timesheets', {
            params: {
                $filter: `month eq ${month} and year eq ${year} and user_ID eq ${userId}`,
                $expand: 'entries,currentApprover,approvalHistory($expand=actor)',
            },
        })
        const data = response.data.value || response.data
        if (data.length > 0) {
            const ts = data[0]
            const entries = ts.entries ? ts.entries.map((e: any) => ({
                id: e.ID,
                date: e.date,
                hours: Number(e.loggedHours) || 0,
                description: e.description,
                projectId: e.project_ID,
                taskId: e.task_ID,
            })) : []
            const approvalHistory: ApprovalHistory[] = ts.approvalHistory ? ts.approvalHistory.map((h: any) => ({
                id: h.ID,
                action: h.action,
                fromStatus: h.fromStatus,
                toStatus: h.toStatus,
                comment: h.comment,
                timestamp: h.timestamp || h.createdAt,
                actor: h.actor ? {
                    id: h.actor.ID,
                    firstName: h.actor.firstName,
                    lastName: h.actor.lastName,
                    role: h.actor.role,
                } : undefined,
            })) : []
            return {
                id: ts.ID,
                month: ts.month,
                year: ts.year,
                status: ts.status as TimesheetStatusType,
                entries,
                submitDate: ts.submitDate,
                approveDate: ts.approveDate,
                totalHours: entries.reduce((sum: number, e: any) => sum + e.hours, 0),
                comment: ts.comment,
                approvalHistory,
                currentApprover: ts.currentApprover ? {
                    id: ts.currentApprover.ID,
                    firstName: ts.currentApprover.firstName,
                    lastName: ts.currentApprover.lastName,
                    role: ts.currentApprover.role,
                } : undefined,
            }
        }
        return null
    },

    create: async (timesheet: Omit<Timesheet, 'id' | 'entries'> & { user_ID: string }): Promise<Timesheet> => {
        const response = await api.post('/Timesheets', {
            month: timesheet.month,
            year: timesheet.year,
            status: timesheet.status,
            user_ID: timesheet.user_ID,
        })
        return {
            id: response.data.ID,
            month: response.data.month,
            year: response.data.year,
            status: response.data.status as TimesheetStatusType,
            entries: []
        }
    },

    submit: async (timesheetId: string, approverId?: string): Promise<string> => {
        const response = await api.post('/submitTimesheet', { timesheetId, approverId })
        return response.data.value || response.data
    },

    approve: async (timesheetId: string, comment?: string): Promise<string> => {
        const response = await api.post('/approveTimesheet', { timesheetId, comment })
        return response.data.value || response.data
    },

    reject: async (timesheetId: string, comment?: string): Promise<string> => {
        const response = await api.post('/rejectTimesheet', { timesheetId, comment })
        return response.data.value || response.data
    },

    finish: async (timesheetId: string): Promise<string> => {
        const response = await api.post('/finishTimesheet', { timesheetId })
        return response.data.value || response.data
    },

    submitToAdmin: async (timesheetId: string, adminId: string): Promise<string> => {
        const response = await api.post('/submitToAdmin', { timesheetId, adminId })
        return response.data.value || response.data
    },

    getApprovableTimesheets: async (): Promise<Timesheet[]> => {
        const response = await api.get('/getApprovableTimesheets()')
        const data = response.data.value || response.data
        return data.map((ts: any) => ({
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
    },

    getTimesheetDetail: async (timesheetId: string): Promise<Timesheet & { entries: TimesheetEntry[] }> => {
        const response = await api.get(`/Timesheets(${timesheetId})`, {
            params: {
                $expand: 'entries($expand=project,task),currentApprover,user,approvalHistory($expand=actor)',
            },
        })
        const ts = response.data
        const entries = ts.entries ? ts.entries.map((e: any) => ({
            id: e.ID,
            date: e.date,
            hours: Number(e.loggedHours) || 0,
            approvedHours: e.approvedHours != null ? Number(e.approvedHours) : undefined,
            description: e.description,
            projectId: e.project_ID,
            projectName: e.project?.name || '',
            taskId: e.task_ID,
            taskName: e.task?.name || '',
        })) : []
        const approvalHistory: ApprovalHistory[] = ts.approvalHistory ? ts.approvalHistory.map((h: any) => ({
            id: h.ID,
            action: h.action,
            fromStatus: h.fromStatus,
            toStatus: h.toStatus,
            comment: h.comment,
            timestamp: h.timestamp || h.createdAt,
            actor: h.actor ? {
                id: h.actor.ID,
                firstName: h.actor.firstName,
                lastName: h.actor.lastName,
                role: h.actor.role,
            } : undefined,
        })) : []
        return {
            id: ts.ID,
            month: ts.month,
            year: ts.year,
            status: ts.status as TimesheetStatusType,
            entries,
            submitDate: ts.submitDate,
            approveDate: ts.approveDate,
            finishedDate: ts.finishedDate,
            totalHours: entries.reduce((sum: number, e: any) => sum + e.hours, 0),
            comment: ts.comment,
            approvalHistory,
            currentApprover: ts.currentApprover ? {
                id: ts.currentApprover.ID,
                firstName: ts.currentApprover.firstName,
                lastName: ts.currentApprover.lastName,
                role: ts.currentApprover.role,
            } : undefined,
            user: ts.user ? {
                id: ts.user.ID,
                firstName: ts.user.firstName,
                lastName: ts.user.lastName,
                email: ts.user.email,
                role: ts.user.role,
            } : undefined,
        }
    },

    modifyEntryHours: async (entryId: string, approvedHours: number): Promise<string> => {
        const response = await api.post('/modifyEntryHours', { entryId, approvedHours })
        return response.data.value || response.data
    },
}

// Timesheet Entries API
export const timesheetEntriesAPI = {
    getAll: async (month: number, year: number, userId: string): Promise<TimesheetEntry[]> => {

        const response = await api.get('/TimesheetEntries', {
            params: {
                $filter: `month(date) eq ${month} and year(date) eq ${year} and timesheet/user_ID eq ${userId}`,
            },
        })
        return (response.data.value || response.data).map((e: any) => ({
            id: e.ID,
            date: e.date,
            hours: Number(e.loggedHours) || 0,
            description: e.description,
            projectId: e.project_ID,
            taskId: e.task_ID,
        }))
    },

    create: async (entry: Omit<TimesheetEntry, 'id'> & { timesheetId: string }): Promise<TimesheetEntry> => {
        const response = await api.post('/TimesheetEntries', {
            date: entry.date,
            loggedHours: entry.hours,
            description: entry.description,
            project_ID: entry.projectId,
            task_ID: entry.taskId || null,
            timesheet_ID: entry.timesheetId,
        })
        return {
            id: response.data.ID,
            date: response.data.date,
            hours: Number(response.data.loggedHours) || 0,
            description: response.data.description,
            projectId: response.data.project_ID,
            taskId: response.data.task_ID,
        }
    },

    update: async (id: string, entry: Partial<TimesheetEntry>): Promise<TimesheetEntry> => {
        const payload: any = {}
        if (entry.date) payload.date = entry.date
        if (entry.hours !== undefined) payload.loggedHours = entry.hours
        if (entry.description !== undefined) payload.description = entry.description
        if (entry.projectId) payload.project_ID = entry.projectId
        if (entry.taskId !== undefined) payload.task_ID = entry.taskId || null

        const response = await api.patch(`/TimesheetEntries(${id})`, payload)
        return {
            id: response.data.ID,
            date: response.data.date,
            hours: Number(response.data.loggedHours) || 0,
            description: response.data.description,
            projectId: response.data.project_ID,
            taskId: response.data.task_ID,
        }
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/TimesheetEntries(${id})`)
    },

    bulkSave: async (entries: (TimesheetEntry & { timesheetId: string })[]): Promise<void> => {
        const promises = entries.map(entry => {
            if (entry.id.startsWith('local-')) {
                // New entry - create
                return timesheetEntriesAPI.create(entry)
            } else {
                // Existing entry - update
                return timesheetEntriesAPI.update(entry.id, entry)
            }
        })
        await Promise.all(promises)
    },
}

// User Info API (get authenticated user from backend)
export const userInfoAPI = {
    get: async (): Promise<{ id: string; email: string; firstName: string; lastName: string; role: string; manager?: { id: string; firstName: string; lastName: string; role: string } }> => {
        const response = await api.get('/userInfo()')
        return response.data
    },

    getWithManager: async (userId: string): Promise<{ id: string; firstName: string; lastName: string; role: string; manager?: { id: string; firstName: string; lastName: string; role: string } }> => {
        const response = await api.get(`/Users(${userId})`, {
            params: {
                $expand: 'manager',
            },
        })
        const data = response.data
        return {
            id: data.ID,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role,
            manager: data.manager ? {
                id: data.manager.ID,
                firstName: data.manager.firstName,
                lastName: data.manager.lastName,
                role: data.manager.role,
            } : undefined,
        }
    },

    getPotentialApprovers: async (): Promise<{ id: string; firstName: string; lastName: string; role: string; email: string }[]> => {
        const response = await api.get('/Users', {
            params: {
                $filter: `role eq 'TeamLead' or role eq 'Admin'`,
            },
        })
        const data = response.data.value || response.data
        return data.map((u: any) => ({
            id: u.ID,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            email: u.email,
        }))
    },
}

export default api

