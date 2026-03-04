import { create } from 'zustand'
import type { TimesheetEntry, Timesheet, User, TimesheetStatusType, ApprovalHistory } from '@/shared/types'
import { getUserInfo, getAllUsers } from '@/features/auth/api/auth-api'
import { getTimesheetByMonth, createTimesheet, submitTimesheet as submitTimesheetApi } from '@/features/timesheet/api/timesheet-api'
import { getEntries, bulkSaveEntries } from '@/features/timesheet/api/timesheet-entry-api'
import { setMockUserId } from '@/shared/lib/mock-user'

interface TimesheetState {
    currentMonth: Date
    currentUser: User | null
    timesheets: Record<string, Timesheet> // Key: "YYYY-MM"
    currentTimesheetStatus: TimesheetStatusType // Status of current month's timesheet
    currentTimesheetComment: string | null // Comment from last action (e.g. rejection reason)
    currentTimesheetId: string | null // ID of current month's timesheet
    currentApprovalHistory: ApprovalHistory[] // Approval history for current timesheet
    entries: TimesheetEntry[] // Local draft entries
    isDirty: boolean // Tracks unsaved changes
    isLoading: boolean

    setCurrentMonth: (date: Date) => void

    // Auth
    availableUsers: User[]
    fetchAvailableUsers: () => Promise<void>
    fetchCurrentUser: () => Promise<void>
    switchUser: (userId: string) => void
    logout: () => void

    // Timesheet Entries (Draft Mode)
    fetchEntries: (month: number, year: number) => Promise<void>
    addEntry: (entry: Omit<TimesheetEntry, 'id'>) => void
    updateEntry: (id: string, entry: Partial<TimesheetEntry>) => void
    deleteEntry: (id: string) => void
    deleteEntries: (ids: string[]) => void
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
    currentApprovalHistory: [],
    entries: [],
    isDirty: false,
    isLoading: false,

    setCurrentMonth: (date) => set({ currentMonth: date }),

    availableUsers: [],
    fetchAvailableUsers: async () => {
        try {
            const users = await getAllUsers()
            set({ availableUsers: users })
        } catch (error) {
            console.error('Failed to fetch available users:', error)
        }
    },

    // Fetch the authenticated user identity from the backend
    fetchCurrentUser: async () => {
        try {
            const userInfo = await getUserInfo()
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
        const user = get().availableUsers.find((u) => u.id === userId)
        if (!user) return

        // Set the impersonation header for all future API calls
        setMockUserId(userId)

        // Update store and re-fetch data
        set({ currentUser: user, entries: [], currentTimesheetStatus: 'Draft', currentTimesheetComment: null, currentTimesheetId: null })
        const { currentMonth } = get()
        get().fetchEntries(currentMonth.getMonth() + 1, currentMonth.getFullYear())
    },

    // Clear current user
    logout: () => {
        setMockUserId('')
        set({ currentUser: null, entries: [], currentTimesheetStatus: 'Draft', currentTimesheetComment: null, currentTimesheetId: null, currentApprovalHistory: [] })
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
            const timesheet = await getTimesheetByMonth(month, year, currentUser.id)
            if (timesheet) {
                set({
                    currentTimesheetStatus: timesheet.status,
                    currentTimesheetComment: timesheet.comment || null,
                    currentTimesheetId: timesheet.id,
                    currentApprovalHistory: timesheet.approvalHistory || [],
                })
            } else {
                set({
                    currentTimesheetStatus: 'Draft',
                    currentTimesheetComment: null,
                    currentTimesheetId: null,
                    currentApprovalHistory: [],
                })
            }

            const entries = await getEntries(month, year, currentUser.id)
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

    deleteEntries: (ids) => {
        const idSet = new Set(ids)
        set((state) => ({
            entries: state.entries.filter((e) => !idSet.has(e.id)),
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
            let timesheet = await getTimesheetByMonth(month, year, userId)
            if (!timesheet) {
                timesheet = await createTimesheet({
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

            await bulkSaveEntries(entriesWithTimesheetId)

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
                const timesheet = await getTimesheetByMonth(month, year, currentUser.id)
                if (!timesheet) {
                    throw new Error('No timesheet found. Please save your entries first.')
                }
                timesheetId = timesheet.id
            }

            await submitTimesheetApi(timesheetId, approverId)
            set({ currentTimesheetStatus: 'Submitted', isLoading: false })
        } catch (error: unknown) {
            console.error('Failed to submit timesheet:', error)
            set({ isLoading: false })
            throw error
        }
    },
}))
