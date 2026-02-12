import axios from 'axios'
import type { Project, TimesheetEntry, Timesheet } from '@/shared/types'

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
            isActive: p.isActive,
        }))
    },

    create: async (project: Omit<Project, 'id'> & { user_ID?: string }): Promise<Project> => {
        const response = await api.post('/Projects', {
            name: project.name,
            code: project.code,
            isActive: project.isActive,
            ...(project.user_ID && { user_ID: project.user_ID }),
        })
        return {
            id: response.data.ID,
            name: response.data.name,
            code: response.data.code,
            isActive: response.data.isActive,
        }
    },

    update: async (id: string, project: Partial<Project>): Promise<Project> => {
        const response = await api.patch(`/Projects(${id})`, project)
        return {
            id: response.data.ID,
            name: response.data.name,
            code: response.data.code,
            isActive: response.data.isActive,
        }
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/Projects(${id})`)
    },
}

// Timesheets API
export const timesheetsAPI = {
    getByMonth: async (month: number, year: number, userId: string): Promise<Timesheet | null> => {
        const response = await api.get('/Timesheets', {
            params: {
                $filter: `month eq ${month} and year eq ${year} and user_ID eq ${userId}`,
                $expand: 'entries',
            },
        })
        const data = response.data.value || response.data
        if (data.length > 0) {
            return {
                id: data[0].ID,
                month: data[0].month,
                year: data[0].year,
                status: data[0].status,
                entries: data[0].entries ? data[0].entries.map((e: any) => ({
                    id: e.ID,
                    date: e.date,
                    hours: e.hours,
                    description: e.description,
                    projectId: e.project_ID,
                })) : []
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
            status: response.data.status,
            entries: []
        }
    }
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
            hours: e.hours,
            description: e.description,
            projectId: e.project_ID
        }))
    },

    create: async (entry: Omit<TimesheetEntry, 'id'> & { timesheetId: string }): Promise<TimesheetEntry> => {
        const response = await api.post('/TimesheetEntries', {
            date: entry.date,
            hours: entry.hours,
            description: entry.description,
            project_ID: entry.projectId,
            timesheet_ID: entry.timesheetId,
        })
        return {
            id: response.data.ID,
            date: response.data.date,
            hours: response.data.hours,
            description: response.data.description,
            projectId: response.data.project_ID,
        }
    },

    update: async (id: string, entry: Partial<TimesheetEntry>): Promise<TimesheetEntry> => {
        const payload: any = {}
        if (entry.date) payload.date = entry.date
        if (entry.hours !== undefined) payload.hours = entry.hours
        if (entry.description !== undefined) payload.description = entry.description
        if (entry.projectId) payload.project_ID = entry.projectId

        const response = await api.patch(`/TimesheetEntries(${id})`, payload)
        return {
            id: response.data.ID,
            date: response.data.date,
            hours: response.data.hours,
            description: response.data.description,
            projectId: response.data.project_ID,
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
    get: async (): Promise<{ id: string; email: string; firstName: string; lastName: string; role: string }> => {
        const response = await api.get('/userInfo()')
        return response.data
    },
}

export default api
