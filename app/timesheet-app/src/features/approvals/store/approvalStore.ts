import { create } from 'zustand'
import type { Timesheet, TimesheetEntry } from '@/shared/types'
import {
    getApprovableTimesheets,
    getTimesheetDetail,
    modifyEntryHours,
    approveTimesheet as approveTimesheetApi,
    rejectTimesheet as rejectTimesheetApi,
    submitToAdmin as submitTimesheetToAdmin
} from '@/features/timesheet/api/timesheet-api'
import { api } from '@/shared/api/http'

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
    admins: any[] // Store list of admins for TeamLead to select

    // Actions
    setFilter: (filter: ApprovalState['filter']) => void
    fetchApprovableTimesheets: () => Promise<void>
    fetchTimesheetDetail: (timesheetId: string) => Promise<void>
    setModifiedHours: (entryId: string, hours: number) => void
    setComment: (comment: string) => void
    fetchAdmins: () => Promise<void>

    approveTimesheet: (timesheetId: string) => Promise<void>
    rejectTimesheet: (timesheetId: string) => Promise<void>
    submitToAdmin: (timesheetId: string, adminId: string) => Promise<void>
    saveModifiedHours: () => Promise<void>
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

    fetchAdmins: async () => {
        try {
            // Reusing get users with role Admin. 
            // In a real scenario we might have a specific endpoint, but for now we can fetch all and filter or call an admin endpoint.
            // Using a simple api.get to Users?$filter=role eq 'Admin'
            const data: any = await api.get('/api/admin/Users?$filter=role eq \'Admin\'')
            const admins = data.value || data
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
            await submitTimesheetToAdmin(timesheetId, adminId)
            await get().fetchApprovableTimesheets()
        } catch (error) {
            console.error('Failed to submit timesheet to admin:', error)
            throw error
        }
    }
}))
