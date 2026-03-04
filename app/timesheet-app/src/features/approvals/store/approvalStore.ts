import { create } from 'zustand'
import type { Timesheet, TimesheetEntry } from '@/shared/types'
import {
    getTimesheetsByMonthYear,
    getTimesheetDetailByTeamLead,
    approveTimesheetByTeamLead,
    rejectTimesheetByTeamLead,
    createBatch,
    bulkApproveTimesheets as bulkApproveApi,
    bulkRejectTimesheets as bulkRejectApi
} from '@/features/approvals/api/teamlead-api'
import { api } from '@/shared/api/http'

interface ApprovalState {
    // List of timesheets pending this user's approval
    timesheets: Timesheet[]
    isLoading: boolean
    filter: 'All' | 'Submitted' | 'Approved' | 'Rejected' | 'Finished'
    currentMonth: number
    currentYear: number

    // Detail view
    selectedTimesheet: (Timesheet & { entries: TimesheetEntry[] }) | null
    isDetailLoading: boolean
    modifiedHours: Record<string, number> // entryId → approvedHours
    entryStatus: Record<string, string> // entryId -> status
    entryComments: Record<string, string> // entryId -> approverComment
    comment: string
    admins: { id: string; firstName: string; lastName: string; role: string }[] // Store list of admins for TeamLead to select

    // Actions
    setFilter: (filter: ApprovalState['filter']) => void
    setPeriod: (month: number, year: number) => void
    fetchApprovableTimesheets: () => Promise<void>
    fetchTimesheetDetail: (timesheetId: string) => Promise<void>
    setModifiedHours: (entryId: string, hours: number) => void
    setEntryStatus: (entryId: string, status: string) => void
    setEntryComment: (entryId: string, comment: string) => void
    setComment: (comment: string) => void
    fetchAdmins: () => Promise<void>

    approveTimesheet: (timesheetId: string) => Promise<void>
    rejectTimesheet: (timesheetId: string) => Promise<void>
    bulkApproveTimesheets: (timesheetIds: string[], comment?: string) => Promise<void>
    bulkRejectTimesheets: (timesheetIds: string[], comment?: string) => Promise<void>
    submitToAdmin: (timesheetId: string, adminId: string) => Promise<void>
    bulkBatchToAdmin: (timesheetIds: string[], adminId: string) => Promise<void>
    saveModifiedHours: () => Promise<void>
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
    timesheets: [],
    isLoading: false,
    filter: 'All',
    currentMonth: new Date().getMonth() + 1,
    currentYear: new Date().getFullYear(),

    selectedTimesheet: null,
    isDetailLoading: false,
    modifiedHours: {},
    entryStatus: {},
    entryComments: {},
    comment: '',
    admins: [],

    setFilter: (filter) => set({ filter }),

    setPeriod: (month, year) => {
        set({ currentMonth: month, currentYear: year })
        get().fetchApprovableTimesheets()
    },

    fetchApprovableTimesheets: async () => {
        set({ isLoading: true })
        try {
            const { currentMonth, currentYear } = get()
            const timesheets = await getTimesheetsByMonthYear(currentMonth, currentYear)
            set({ timesheets, isLoading: false })
        } catch (error) {
            console.error('Failed to fetch approvable timesheets:', error)
            set({ isLoading: false })
        }
    },

    fetchTimesheetDetail: async (timesheetId: string) => {
        set({ isDetailLoading: true, modifiedHours: {}, entryStatus: {}, entryComments: {}, comment: '' })
        try {
            const ts = await getTimesheetDetailByTeamLead(timesheetId)
            // Pre-populate state with existing values
            const modifiedHours: Record<string, number> = {}
            const entryStatus: Record<string, string> = {}
            const entryComments: Record<string, string> = {}

            ts.entries.forEach(e => {
                modifiedHours[e.id] = e.approvedHours != null ? e.approvedHours : e.hours
                entryStatus[e.id] = e.status || 'Pending'
                entryComments[e.id] = e.approverComment || ''
            })
            set({ selectedTimesheet: ts, isDetailLoading: false, modifiedHours, entryStatus, entryComments, comment: ts.comment || '' })
        } catch (error) {
            console.error('Failed to fetch timesheet detail:', error)
            set({ isDetailLoading: false })
        }
    },

    setModifiedHours: (entryId, hours) => {
        set((state) => ({
            modifiedHours: { ...state.modifiedHours, [entryId]: hours },
        }))
    },

    setEntryStatus: (entryId, status) => {
        set((state) => ({
            entryStatus: { ...state.entryStatus, [entryId]: status },
        }))
    },

    setEntryComment: (entryId, comment) => {
        set((state) => ({
            entryComments: { ...state.entryComments, [entryId]: comment },
        }))
    },

    setComment: (comment) => set({ comment }),

    fetchAdmins: async () => {
        try {
            // Reusing get users with role Admin. 
            // In a real scenario we might have a specific endpoint, but for now we can fetch all and filter or call an admin endpoint.
            // Using a simple api.get to Users?$filter=role eq 'Admin'
            const data: unknown = await api.get('/api/admin/Users?$filter=role eq \'Admin\'')
            const admins = (data && typeof data === 'object' && 'value' in data ? (data as any).value : data) as { id: string; firstName: string; lastName: string; role: string }[]
            set({ admins })
        } catch (error) {
            console.error('Failed to fetch admins:', error)
        }
    },

    saveModifiedHours: async () => {
        const { modifiedHours, entryStatus, entryComments, selectedTimesheet } = get()
        if (!selectedTimesheet) return

        try {
            // Check all entries for changes in hours, status, or comments
            const promises = selectedTimesheet.entries.map(e => {
                const newHours = modifiedHours[e.id] ?? e.hours
                const newStatus = entryStatus[e.id] ?? e.status ?? 'Pending'
                const newComment = entryComments[e.id] ?? e.approverComment ?? ''

                const hoursChanged = newHours !== e.hours && newHours !== e.approvedHours
                const statusChanged = newStatus !== (e.status || 'Pending')
                const commentChanged = newComment !== (e.approverComment || '')

                if (hoursChanged || statusChanged || commentChanged) {
                    // Import `reviewEntryByTeamLead` into the current file at the top or rely on it being added
                    return import('@/features/approvals/api/teamlead-api').then(m => m.reviewEntryByTeamLead(e.id, newStatus, newHours, newComment))
                }
                return Promise.resolve('')
            })
            await Promise.all(promises)
        } catch (error) {
            console.error('Failed to save modified hours:', error)
            throw error
        }
    },

    approveTimesheet: async (timesheetId: string) => {
        const { comment } = get()
        try {
            // Save any modified hours first
            await get().saveModifiedHours()
            await approveTimesheetByTeamLead(timesheetId, comment || undefined)
            // Refresh list
            await get().fetchApprovableTimesheets()
        } catch (error) {
            console.error('Failed to approve timesheet:', error)
            throw error
        }
    },

    rejectTimesheet: async (timesheetId: string) => {
        const { comment } = get()
        try {
            await rejectTimesheetByTeamLead(timesheetId, comment || undefined)
            await get().fetchApprovableTimesheets()
        } catch (error) {
            console.error('Failed to reject timesheet:', error)
            throw error
        }
    },

    bulkApproveTimesheets: async (timesheetIds: string[], comment?: string) => {
        try {
            await bulkApproveApi(timesheetIds, comment)
            await get().fetchApprovableTimesheets()
        } catch (error) {
            console.error('Failed to bulk approve timesheets:', error)
            throw error
        }
    },

    bulkRejectTimesheets: async (timesheetIds: string[], comment?: string) => {
        try {
            await bulkRejectApi(timesheetIds, comment)
            await get().fetchApprovableTimesheets()
        } catch (error) {
            console.error('Failed to bulk reject timesheets:', error)
            throw error
        }
    },

    submitToAdmin: async (timesheetId: string, adminId: string) => {
        try {
            await get().saveModifiedHours()

            const { selectedTimesheet, timesheets, comment } = get()
            const ts = selectedTimesheet || timesheets.find(t => t.id === timesheetId)

            // Auto-approve first if it's currently 'Submitted'
            if (ts && ts.status === 'Submitted') {
                await approveTimesheetByTeamLead(timesheetId, comment || undefined)
            }

            await createBatch([timesheetId], adminId)
            await get().fetchApprovableTimesheets()
        } catch (error) {
            console.error('Failed to submit timesheet to admin:', error)
            throw error
        }
    },

    bulkBatchToAdmin: async (timesheetIds: string[], adminId: string) => {
        try {
            await createBatch(timesheetIds, adminId)
            await get().fetchApprovableTimesheets()
        } catch (error) {
            console.error('Failed to batch timesheets to admin:', error)
            throw error
        }
    }
}))
