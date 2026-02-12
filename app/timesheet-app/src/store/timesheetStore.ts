import { create } from 'zustand'
import type { TimesheetEntry, Timesheet, Project, User } from '@/types'
import { projectsAPI, timesheetEntriesAPI, timesheetsAPI } from '@/lib/api'

// Mock users for testing — replace with real auth later
export const MOCK_USERS: User[] = [
    { id: '2b7a2d96-0e94-4d13-8a03-7f8a70562590', email: 'alice@example.com', firstName: 'Alice', lastName: 'Nguyen', role: 'Employee' },
    { id: 'c4e8f1a2-3b56-4d78-9e01-a1b2c3d4e5f6', email: 'bob@example.com', firstName: 'Bob', lastName: 'Tran', role: 'Manager' },
]

interface TimesheetState {
    currentMonth: Date
    currentUser: User
    timesheets: Record<string, Timesheet> // Key: "YYYY-MM"
    entries: TimesheetEntry[] // Local draft entries
    projects: Project[]
    isDirty: boolean // Tracks unsaved changes
    isLoading: boolean

    setCurrentMonth: (date: Date) => void
    setCurrentUser: (user: User) => void

    // Projects
    fetchProjects: () => Promise<void>
    addProject: (project: Omit<Project, 'id'>) => Promise<void>
    updateProject: (id: string, project: Partial<Project>) => Promise<void>
    deleteProject: (id: string) => Promise<void>

    // Timesheet Entries (Draft Mode)
    fetchEntries: (month: number, year: number) => Promise<void>
    addEntry: (entry: Omit<TimesheetEntry, 'id'>) => void
    updateEntry: (id: string, entry: Partial<TimesheetEntry>) => void
    deleteEntry: (id: string) => void
    saveEntries: () => Promise<void>

    submitTimesheet: (year: number, month: number) => void
}

let localIdCounter = 0

export const useTimesheetStore = create<TimesheetState>((set, get) => ({
    currentMonth: new Date(),
    currentUser: MOCK_USERS[0],
    timesheets: {},
    entries: [],
    projects: [],
    isDirty: false,
    isLoading: false,

    setCurrentMonth: (date) => set({ currentMonth: date }),

    setCurrentUser: (user) => {
        set({ currentUser: user, projects: [], entries: [] })
        // Re-fetch projects and entries for the new user
        get().fetchProjects()
        const { currentMonth } = get()
        get().fetchEntries(currentMonth.getMonth() + 1, currentMonth.getFullYear())
    },

    // Projects - immediate API persistence, filtered by current user
    fetchProjects: async () => {
        set({ isLoading: true })
        try {
            const { currentUser } = get()
            const projects = await projectsAPI.getProjectsByUser(currentUser.id)
            set({ projects, isLoading: false })
        } catch (error) {
            console.error('Failed to fetch projects:', error)
            set({ isLoading: false })
        }
    },

    addProject: async (project) => {
        set({ isLoading: true })
        try {
            const { currentUser } = get()
            const newProject = await projectsAPI.create({
                ...project,
                user_ID: currentUser.id,
            })
            set((state) => ({
                projects: [...state.projects, newProject],
                isLoading: false,
            }))
        } catch (error) {
            console.error('Failed to create project:', error)
            set({ isLoading: false })
            throw error
        }
    },

    updateProject: async (id, project) => {
        set({ isLoading: true })
        try {
            const updatedProject = await projectsAPI.update(id, project)
            set((state) => ({
                projects: state.projects.map((p) =>
                    p.id === id ? { ...p, ...updatedProject } : p
                ),
                isLoading: false,
            }))
        } catch (error) {
            console.error('Failed to update project:', error)
            set({ isLoading: false })
            throw error
        }
    },

    deleteProject: async (id) => {
        set({ isLoading: true })
        try {
            await projectsAPI.delete(id)
            set((state) => ({
                projects: state.projects.filter((p) => p.id !== id),
                isLoading: false,
            }))
        } catch (error) {
            console.error('Failed to delete project:', error)
            set({ isLoading: false })
            throw error
        }
    },

    // Timesheet Entries - Draft mode (local changes until saveEntries)
    fetchEntries: async (month, year) => {
        set({ isLoading: true })
        try {
            const { currentUser } = get()
            const entries = await timesheetEntriesAPI.getAll(month, year, currentUser.id)
            set({ entries, isDirty: false, isLoading: false })
        } catch (error) {
            console.error('Failed to fetch entries:', error)
            set({ isLoading: false })
        }
    },

    addEntry: (entry) => {
        const newEntry: TimesheetEntry = {
            id: `local-${localIdCounter++}`,
            ...entry,
        }
        set((state) => ({
            entries: [...state.entries, newEntry],
            isDirty: true,
        }))
    },

    updateEntry: (id, entry) => {
        set((state) => ({
            entries: state.entries.map((e) =>
                e.id === id ? { ...e, ...entry } : e
            ),
            isDirty: true,
        }))
    },

    deleteEntry: (id) => {
        set((state) => ({
            entries: state.entries.filter((e) => e.id !== id),
            isDirty: true,
        }))
    },

    saveEntries: async () => {
        const { entries, currentMonth, currentUser } = get()
        set({ isLoading: true })
        try {
            const month = currentMonth.getMonth() + 1
            const year = currentMonth.getFullYear()
            const userId = currentUser.id

            // 1. Get or Create Timesheet Header
            let timesheet = await timesheetsAPI.getByMonth(month, year, userId)
            if (!timesheet) {
                timesheet = await timesheetsAPI.create({
                    month,
                    year,
                    status: 'Draft',
                    user_ID: currentUser.id,
                })
            }

            const timesheetId = timesheet.id

            // 2. Save Entries with Timesheet ID
            const entriesWithTimesheetId = entries.map(e => ({
                ...e,
                timesheetId
            }))

            await timesheetEntriesAPI.bulkSave(entriesWithTimesheetId)

            // Refetch to get server IDs and verify
            await get().fetchEntries(month, year)

            set({ isDirty: false, isLoading: false })
        } catch (error) {
            console.error('Failed to save entries:', error)
            set({ isLoading: false })
            throw error
        }
    },

    submitTimesheet: (year, month) => {
        console.log('Submitting timesheet:', year, month)
        // TODO: Implement with backend API
    },
}))
