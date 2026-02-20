import { create } from 'zustand'
import type { Timesheet, TimesheetEntry } from '@/shared/types'
import {
    getApprovableTimesheets,
    getTimesheetDetail,
    modifyEntryHours,
    approveTimesheet as approveTimesheetApi,
    rejectTimesheet as rejectTimesheetApi,
    submitToAdmin as submitToAdminApi,
} from '@/features/timesheet/api/timesheet-api'
import { getPotentialApprovers } from '@/features/auth/api/auth-api'

interface ApprovalState {
    // List of timesheets pending this user's approval
    timesheets: Timesheet[]
    isLoading: boolean
    filter: 'All' | 'Submitted' | 'Approved' | 'Rejected' | 'Finished'

    // Detail view
    selectedTimesheet: (Timesheet & { entries: TimesheetEntry[] }) | null
    isDetailLoading: boolean
    modifiedHours: Record<string, number> // entryId → approvedHours
    comment: string

    // Admin list for "Submit to Admin" dialog
    admins: { id: string; firstName: string; lastName: string; role: string; email: string }[]

    // Actions
    setFilter: (filter: ApprovalState['filter']) => void
    fetchApprovableTimesheets: () => Promise<void>
    fetchTimesheetDetail: (timesheetId: string) => Promise<void>
    setModifiedHours: (entryId: string, hours: number) => void
    setComment: (comment: string) => void

    approveTimesheet: (timesheetId: string) => Promise<void>
    rejectTimesheet: (timesheetId: string) => Promise<void>
    submitToAdmin: (timesheetId: string, adminId: string) => Promise<void>
    saveModifiedHours: () => Promise<void>
    fetchAdmins: () => Promise<void>
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
    timesheets: [],
    isLoading: false,
    filter: 'All',

    selectedTimesheet: null,
    isDetailLoading: false,
    modifiedHours: {},
    comment: '',
    admins: [],

    setFilter: (filter) => set({ filter }),

    fetchApprovableTimesheets: async () => {
        set({ isLoading: true })
        try {
            const timesheets = await getApprovableTimesheets()
            set({ timesheets, isLoading: false })
        } catch (error) {
            console.error('Failed to fetch approvable timesheets:', error)
            set({ isLoading: false })
        }
    },

    fetchTimesheetDetail: async (timesheetId: string) => {
        set({ isDetailLoading: true, modifiedHours: {}, comment: '' })
        try {
            const ts = await getTimesheetDetail(timesheetId)
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

    saveModifiedHours: async () => {
        const { modifiedHours, selectedTimesheet } = get()
        if (!selectedTimesheet) return

        try {
            const promises = Object.entries(modifiedHours).map(([entryId, hours]) => {
                const original = selectedTimesheet.entries.find(e => e.id === entryId)
                // Only save if hours were actually modified
                if (original && hours !== original.hours) {
                    return modifyEntryHours(entryId, hours)
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
            await approveTimesheetApi(timesheetId, comment || undefined)
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
            await rejectTimesheetApi(timesheetId, comment || undefined)
            await get().fetchApprovableTimesheets()
        } catch (error) {
            console.error('Failed to reject timesheet:', error)
            throw error
        }
    },

    submitToAdmin: async (timesheetId: string, adminId: string) => {
        try {
            await get().saveModifiedHours()
            await submitToAdminApi(timesheetId, adminId)
            await get().fetchApprovableTimesheets()
        } catch (error) {
            console.error('Failed to submit to admin:', error)
            throw error
        }
    },

    fetchAdmins: async () => {
        try {
            const approvers = await getPotentialApprovers()
            const admins = approvers.filter(a => a.role === 'Admin' || a.role === 'Manager')
            set({ admins })
        } catch (error) {
            console.error('Failed to fetch admins:', error)
        }
    },
}))
