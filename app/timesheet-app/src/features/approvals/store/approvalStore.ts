import { create } from 'zustand'
import type { Timesheet, TimesheetEntry } from '@/shared/types'
import {
    getTimesheetsByMonthYear,
    getTimesheetDetailByTeamLead,
    modifyEntryHoursByTeamLead,
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
    comment: string
    admins: { id: string; firstName: string; lastName: string; role: string }[] // Store list of admins for TeamLead to select

    // Actions
    setFilter: (filter: ApprovalState['filter']) => void
    setPeriod: (month: number, year: number) => void
    fetchApprovableTimesheets: () => Promise<void>
    fetchTimesheetDetail: (timesheetId: string) => Promise<void>
    setModifiedHours: (entryId: string, hours: number) => void
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
        set({ isDetailLoading: true, modifiedHours: {}, comment: '' })
        try {
            const ts = await getTimesheetDetailByTeamLead(timesheetId)
            // Pre-populate modifiedHours with existing approvedHours
            const modifiedHours: Record<string, number> = {}
            ts.entries.forEach(e => {
                modifiedHours[e.id] = e.approvedHours != null ? e.approvedHours : e.hours
            })
            set({ selectedTimesheet: ts, isDetailLoading: false, modifiedHours, comment: ts.comment || '' })
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
        const { modifiedHours, selectedTimesheet } = get()
        if (!selectedTimesheet) return

        try {
            const promises = Object.entries(modifiedHours).map(([entryId, hours]) => {
                const original = selectedTimesheet.entries.find(e => e.id === entryId)
                // Only save if hours were actually modified
                if (original && hours !== original.hours) {
                    return modifyEntryHoursByTeamLead(entryId, hours)
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
