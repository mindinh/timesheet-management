import { create } from 'zustand'
import type { TimesheetEntry, Timesheet, User, TimesheetStatusType } from '@/shared/types'
import { timesheetEntriesAPI, timesheetsAPI, userInfoAPI, setMockUserId } from '@/shared/lib/api'

export const MOCK_USERS: User[] = [
    { id: '2b7a2d96-0e94-4d13-8a03-7f8a70562590', email: 'alice@example.com', firstName: 'Alice', lastName: 'Nguyen', role: 'Employee' },
    { id: 'c4e8f1a2-3b56-4d78-9e01-a1b2c3d4e5f6', email: 'bob@example.com', firstName: 'Bob', lastName: 'Tran', role: 'TeamLead' },
    { id: 'd5f902b3-4c67-5e89-af12-b2c3d4e5f6a7', email: 'charlie@example.com', firstName: 'Charlie', lastName: 'Le', role: 'TeamLead' },
    { id: 'e6a003c4-5d78-6f90-b023-c3d4e5f6a7b8', email: 'diana@example.com', firstName: 'Diana', lastName: 'Pham', role: 'Admin' },
]

interface TimesheetState {
    currentMonth: Date
    currentUser: User | null
    timesheets: Record<string, Timesheet> // Key: "YYYY-MM"
    currentTimesheetStatus: TimesheetStatusType // Status of current month's timesheet
    currentTimesheetComment: string | null // Comment from last action (e.g. rejection reason)
    currentTimesheetId: string | null // ID of current month's timesheet
    entries: TimesheetEntry[] // Local draft entries
    isDirty: boolean // Tracks unsaved changes
    isLoading: boolean

    setCurrentMonth: (date: Date) => void

    // Auth
    fetchCurrentUser: () => Promise<void>
    switchUser: (userId: string) => void

    // Timesheet Entries (Draft Mode)
    fetchEntries: (month: number, year: number) => Promise<void>
    addEntry: (entry: Omit<TimesheetEntry, 'id'>) => void
    updateEntry: (id: string, entry: Partial<TimesheetEntry>) => void
    deleteEntry: (id: string) => void
    saveEntries: () => Promise<void>

    submitTimesheet: (year: number, month: number, approverId?: string) => Promise<void>
}

let localIdCounter = 0

export const useTimesheetStore = create<TimesheetState>((set, get) => ({
    currentMonth: new Date(),
    currentUser: null,
    timesheets: {},
    currentTimesheetStatus: 'Draft',
    currentTimesheetComment: null,
    currentTimesheetId: null,
    entries: [],
    isDirty: false,
    isLoading: false,

    setCurrentMonth: (date) => set({ currentMonth: date }),

    // Fetch the authenticated user identity from the backend
    fetchCurrentUser: async () => {
        try {
            const userInfo = await userInfoAPI.get()
            set({
                currentUser: {
                    id: userInfo.id,
                    email: userInfo.email,
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    role: userInfo.role,
                },
            })
        } catch (error) {
            console.error('Failed to fetch current user:', error)
        }
    },

    // Switch to a different mock user (for dev testing)
    switchUser: (userId) => {
        const user = MOCK_USERS.find((u) => u.id === userId)
        if (!user) return

        // Set the impersonation header for all future API calls
        setMockUserId(userId)

        // Update store and re-fetch data
        set({ currentUser: user, entries: [], currentTimesheetStatus: 'Draft', currentTimesheetComment: null, currentTimesheetId: null })
        const { currentMonth } = get()
        get().fetchEntries(currentMonth.getMonth() + 1, currentMonth.getFullYear())
    },

    // Timesheet Entries - Draft mode (local changes until saveEntries)
    fetchEntries: async (month, year) => {
        set({ isLoading: true })
        try {
            const { currentUser } = get()
            if (!currentUser) {
                set({ isLoading: false })
                return
            }

            // Also fetch the timesheet header to get its status
            const timesheet = await timesheetsAPI.getByMonth(month, year, currentUser.id)
            if (timesheet) {
                set({
                    currentTimesheetStatus: timesheet.status,
                    currentTimesheetComment: timesheet.comment || null,
                    currentTimesheetId: timesheet.id,
                })
            } else {
                set({
                    currentTimesheetStatus: 'Draft',
                    currentTimesheetComment: null,
                    currentTimesheetId: null,
                })
            }

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
        if (!currentUser) return
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
            set({ currentTimesheetId: timesheetId, currentTimesheetStatus: timesheet.status })

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

    submitTimesheet: async (year, month, approverId) => {
        const { currentUser, currentTimesheetId } = get()
        if (!currentUser) return

        set({ isLoading: true })
        try {
            // Ensure timesheet exists
            let timesheetId = currentTimesheetId
            if (!timesheetId) {
                const timesheet = await timesheetsAPI.getByMonth(month, year, currentUser.id)
                if (!timesheet) {
                    throw new Error('No timesheet found. Please save your entries first.')
                }
                timesheetId = timesheet.id
            }

            await timesheetsAPI.submit(timesheetId, approverId)
            set({ currentTimesheetStatus: 'Submitted', isLoading: false })
        } catch (error: any) {
            console.error('Failed to submit timesheet:', error)
            set({ isLoading: false })
            throw error
        }
    },
}))
