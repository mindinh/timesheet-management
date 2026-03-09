import { create } from 'zustand';
import type { Timesheet, TimesheetEntry } from '@/shared/types';
import {
  getTimesheetsByMonthYear,
  getTimesheetDetailByTeamLead,
  approveTimesheetByTeamLead,
  reopenTimesheetByTeamLead,
  createBatch,
  bulkApproveTimesheets as bulkApproveApi,
  bulkReopenTimesheets as bulkReopenApi,
  getAllBatches,
  getBatchTimesheets,
  getAdmins,
  type TimesheetBatch,
} from '@/features/approvals/api/teamlead-api';


interface ApprovalState {
  // Batch list (main approvals page)
  batches: TimesheetBatch[];
  isBatchLoading: boolean;
  batchTimesheets: Timesheet[];
  isBatchDetailLoading: boolean;

  // List of timesheets pending this user's approval
  timesheets: Timesheet[];
  isLoading: boolean;
  filter: 'All' | 'Submitted' | 'Approved' | 'Reopened' | 'Finished';
  currentMonth: number;
  currentYear: number;

  // Detail view
  selectedTimesheet: (Timesheet & { entries: TimesheetEntry[] }) | null;
  isDetailLoading: boolean;
  modifiedHours: Record<string, number>;
  entryStatus: Record<string, string>;
  entryComments: Record<string, string>;
  comment: string;

  // Admins
  admins: { id: string; firstName: string; lastName: string; role: string }[];

  // Actions
  setFilter: (filter: ApprovalState['filter']) => void;
  setPeriod: (month: number, year: number) => void;
  fetchBatches: () => Promise<void>;
  fetchBatchTimesheets: (batchId: string) => Promise<void>;
  fetchApprovableTimesheets: () => Promise<void>;
  fetchTimesheetDetail: (timesheetId: string) => Promise<void>;
  setModifiedHours: (entryId: string, hours: number) => void;
  setEntryStatus: (entryId: string, status: string) => void;
  setEntryComment: (entryId: string, comment: string) => void;
  setComment: (comment: string) => void;


  approveTimesheet: (timesheetId: string) => Promise<void>;
  reopenTimesheetForEdit: (timesheetId: string) => Promise<void>;
  bulkApproveTimesheets: (timesheetIds: string[], comment?: string) => Promise<void>;
  bulkReopenTimesheetsForEdit: (timesheetIds: string[], comment?: string) => Promise<void>;
  submitToAdmin: (timesheetId: string, adminId?: string) => Promise<void>;
  bulkBatchToAdmin: (timesheetIds: string[]) => Promise<void>;
  saveModifiedHours: () => Promise<void>;
  fetchAdmins: () => Promise<void>;
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  batches: [],
  isBatchLoading: false,
  batchTimesheets: [],
  isBatchDetailLoading: false,

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
    set({ currentMonth: month, currentYear: year });
    get().fetchBatches();
    get().fetchApprovableTimesheets();
  },

  fetchBatches: async () => {
    set({ isBatchLoading: true });
    try {
      const batches = await getAllBatches();
      set({ batches, isBatchLoading: false });
    } catch (error) {
      console.error('Failed to fetch batches:', error);
      set({ isBatchLoading: false });
    }
  },

  fetchBatchTimesheets: async (batchId: string) => {
    set({ isBatchDetailLoading: true });
    try {
      const timesheets = await getBatchTimesheets(batchId);
      set({ batchTimesheets: timesheets, isBatchDetailLoading: false });
    } catch (error) {
      console.error('Failed to fetch batch timesheets:', error);
      set({ isBatchDetailLoading: false });
    }
  },

  fetchApprovableTimesheets: async () => {
    set({ isLoading: true });
    try {
      const { currentMonth, currentYear } = get();
      const timesheets = await getTimesheetsByMonthYear(currentMonth, currentYear);
      set({ timesheets, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch approvable timesheets:', error);
      set({ isLoading: false });
    }
  },

  fetchTimesheetDetail: async (timesheetId: string) => {
    set({ isDetailLoading: true, modifiedHours: {}, entryStatus: {}, entryComments: {}, comment: '' });
    try {
      const ts = await getTimesheetDetailByTeamLead(timesheetId);
      // Pre-populate state with existing values
      const modifiedHours: Record<string, number> = {};
      const entryStatus: Record<string, string> = {};
      const entryComments: Record<string, string> = {};

      ts.entries.forEach((e) => {
        modifiedHours[e.id] = e.approvedHours != null ? e.approvedHours : e.hours;
        entryStatus[e.id] = e.status || 'Pending';
        entryComments[e.id] = e.approverComment || '';
      });
      set({
        selectedTimesheet: ts,
        isDetailLoading: false,
        modifiedHours,
        entryStatus,
        entryComments,
        comment: ts.comment || '',
      });
    } catch (error) {
      console.error('Failed to fetch timesheet detail:', error);
      set({ isDetailLoading: false });
    }
  },

  setModifiedHours: (entryId, hours) => {
    set((state) => ({
      modifiedHours: { ...state.modifiedHours, [entryId]: hours },
    }));
  },

  setEntryStatus: (entryId, status) => {
    set((state) => ({
      entryStatus: { ...state.entryStatus, [entryId]: status },
    }));
  },

  setEntryComment: (entryId, comment) => {
    set((state) => ({
      entryComments: { ...state.entryComments, [entryId]: comment },
    }));
  },

  setComment: (comment) => set({ comment }),


  saveModifiedHours: async () => {
    const { modifiedHours, entryStatus, entryComments, selectedTimesheet } = get();
    if (!selectedTimesheet) return;

    try {
      // Check all entries for changes in hours, status, or comments
      const promises = selectedTimesheet.entries.map((e) => {
        const newHours = modifiedHours[e.id] ?? e.hours;
        const newStatus = entryStatus[e.id] ?? e.status ?? 'Pending';
        const newComment = entryComments[e.id] ?? e.approverComment ?? '';

        const hoursChanged = newHours !== e.hours && newHours !== e.approvedHours;
        const statusChanged = newStatus !== (e.status || 'Pending');
        const commentChanged = newComment !== (e.approverComment || '');

        if (hoursChanged || statusChanged || commentChanged) {
          // Import `reviewEntryByTeamLead` into the current file at the top or rely on it being added
          return import('@/features/approvals/api/teamlead-api').then((m) =>
            m.reviewEntryByTeamLead(e.id, newStatus, newHours, newComment)
          );
        }
        return Promise.resolve('');
      });
      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to save modified hours:', error);
      throw error;
    }
  },

  approveTimesheet: async (timesheetId: string) => {
    const { comment } = get();
    try {
      // Save any modified hours first
      await get().saveModifiedHours();
      await approveTimesheetByTeamLead(timesheetId, comment || undefined);
      // Refresh list
      await get().fetchApprovableTimesheets();
    } catch (error) {
      console.error('Failed to approve timesheet:', error);
      throw error;
    }
  },

  reopenTimesheetForEdit: async (timesheetId: string) => {
    const { comment } = get();
    try {
      await reopenTimesheetByTeamLead(timesheetId, comment || undefined);
      await get().fetchApprovableTimesheets();
    } catch (error) {
      console.error('Failed to reopen timesheet:', error);
      throw error;
    }
  },

  bulkApproveTimesheets: async (timesheetIds: string[], comment?: string) => {
    try {
      await bulkApproveApi(timesheetIds, comment);
      await get().fetchApprovableTimesheets();
    } catch (error) {
      console.error('Failed to bulk approve timesheets:', error);
      throw error;
    }
  },

  bulkReopenTimesheetsForEdit: async (timesheetIds: string[], comment?: string) => {
    try {
      await bulkReopenApi(timesheetIds, comment);
      await get().fetchApprovableTimesheets();
    } catch (error) {
      console.error('Failed to bulk reopen timesheets:', error);
      throw error;
    }
  },

  submitToAdmin: async (timesheetId: string, _adminId?: string) => {
    try {
      await get().saveModifiedHours();

      const { selectedTimesheet, timesheets, comment } = get();
      const ts = selectedTimesheet || timesheets.find((t) => t.id === timesheetId);

      if (ts && ts.status === 'Submitted') {
        await approveTimesheetByTeamLead(timesheetId, comment || undefined);
      }

      await createBatch([timesheetId]);
      await get().fetchApprovableTimesheets();
    } catch (error) {
      console.error('Failed to submit timesheet to admin:', error);
      throw error;
    }
  },

  fetchAdmins: async () => {
    try {
      const admins = await getAdmins();
      set({ admins });
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    }
  },

  bulkBatchToAdmin: async (timesheetIds: string[]) => {
    try {
      await createBatch(timesheetIds);
      await get().fetchApprovableTimesheets();
    } catch (error) {
      console.error('Failed to batch timesheets to admin:', error);
      throw error;
    }
  },
}));
