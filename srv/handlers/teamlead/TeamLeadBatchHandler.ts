import cds from '@sap/cds';
import { resolveUser } from '../../lib/user-resolver';

/**
 * TeamLeadBatchHandler
 * Handles all operations for Team Leads: viewing, approving, adjusting, and batching timesheets.
 */
export class TeamLeadBatchHandler {
    private srv: any;

    constructor(srv: any) {
        this.srv = srv;
    }

    register() {
        this.srv.on('getPendingTimesheets', this.onGetPendingTimesheets.bind(this));
        this.srv.on('approveTimesheet', this.onApproveTimesheet.bind(this));
        this.srv.on('rejectTimesheet', this.onRejectTimesheet.bind(this));
        this.srv.on('bulkApproveTimesheets', this.onBulkApproveTimesheets.bind(this));
        this.srv.on('bulkRejectTimesheets', this.onBulkRejectTimesheets.bind(this));
        this.srv.on('modifyEntryHours', this.onModifyEntryHours.bind(this));
        this.srv.on('createBatch', this.onCreateBatch.bind(this));
    }

    // ── getPendingTimesheets ──
    private async onGetPendingTimesheets(req: any) {
        const user = await resolveUser(req);
        if (!user) return req.reject(401, 'User not found');

        const db = cds.db || await cds.connect.to('db');
        const { Timesheet, TimesheetEntry, User } = db.entities('sap.timesheet');

        // Allow Team Lead to see timesheets directly assigned to them or those of their direct reports.
        // For strictness, usually currentApprover_ID = user.ID
        const timesheets = await SELECT.from(Timesheet)
            .where({ currentApprover_ID: user.ID, status: 'Submitted' })
            .orderBy('year desc', 'month desc', 'submitDate desc');

        const enriched = [];
        for (const ts of timesheets) {
            const [tsUser] = await SELECT.from(User).where({ ID: ts.user_ID });
            const entries = await SELECT.from(TimesheetEntry).where({ timesheet_ID: ts.ID });
            const totalLoggedHours = entries.reduce((sum: number, e: any) => sum + (Number(e.loggedHours) || 0), 0);
            const totalApprovedHours = entries.reduce((sum: number, e: any) => sum + (e.approvedHours !== null && e.approvedHours !== undefined ? Number(e.approvedHours) : Number(e.loggedHours) || 0), 0);

            enriched.push({
                ...ts,
                id: ts.ID,
                totalLoggedHours,
                totalApprovedHours,
                user: tsUser ? {
                    id: tsUser.ID,
                    firstName: tsUser.firstName,
                    lastName: tsUser.lastName,
                    email: tsUser.email,
                    role: tsUser.role,
                } : null,
            });
        }

        return enriched;
    }

    // ── approveTimesheet ──
    private async onApproveTimesheet(req: any) {
        const { timesheetId, comment } = req.data;
        return this.processApproval(req, timesheetId, 'Approved', comment);
    }

    // ── rejectTimesheet ──
    private async onRejectTimesheet(req: any) {
        const { timesheetId, comment } = req.data;
        return this.processApproval(req, timesheetId, 'Rejected', comment);
    }

    // ── bulkApproveTimesheets ──
    private async onBulkApproveTimesheets(req: any) {
        const { timesheetIds, comment } = req.data;
        let count = 0;
        for (const id of timesheetIds) {
            try {
                await this.processApproval(req, id, 'Approved', comment);
                count++;
            } catch (err: any) {
                req.warn(400, `Failed to approve ${id}: ${err.message}`);
            }
        }
        return `Successfully approved ${count} timesheets`;
    }

    // ── bulkRejectTimesheets ──
    private async onBulkRejectTimesheets(req: any) {
        const { timesheetIds, comment } = req.data;
        let count = 0;
        for (const id of timesheetIds) {
            try {
                await this.processApproval(req, id, 'Rejected', comment);
                count++;
            } catch (err: any) {
                req.warn(400, `Failed to reject ${id}: ${err.message}`);
            }
        }
        return `Successfully rejected ${count} timesheets`;
    }

    // ── Internal Action Processor ──
    private async processApproval(req: any, timesheetId: string, action: 'Approved' | 'Rejected', comment?: string) {
        const user = await resolveUser(req);
        if (!user) throw new Error('User not found');

        const db = cds.db || await cds.connect.to('db');
        const { Timesheet, ApprovalHistory } = db.entities('sap.timesheet');

        const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId });
        if (!ts) throw new Error('Timesheet not found');

        if (ts.currentApprover_ID !== user.ID && user.role !== 'Admin') {
            throw new Error('Not authorized to approve/reject this timesheet');
        }

        if (ts.status !== 'Submitted') {
            throw new Error(`Cannot change status from "${ts.status}"`);
        }

        const updateData: any = {
            status: action,
            comment: comment || ts.comment,
            approveDate: action === 'Approved' ? new Date().toISOString() : null
        };

        if (action === 'Rejected') {
            // Send back to employee
            updateData.currentApprover_ID = ts.user_ID;
        }

        await UPDATE(Timesheet).set(updateData).where({ ID: timesheetId });

        await INSERT.into(ApprovalHistory).entries({
            timesheet_ID: timesheetId,
            actor_ID: user.ID,
            action: action,
            fromStatus: ts.status,
            toStatus: action,
            comment: comment || null,
            timestamp: new Date().toISOString(),
        });

        return `Timesheet ${action.toLowerCase()} successfully`;
    }

    // ── modifyEntryHours ──
    private async onModifyEntryHours(req: any) {
        const { entryId, approvedHours } = req.data;
        const user = await resolveUser(req);
        if (!user) return req.reject(401, 'User not found');

        const db = cds.db || await cds.connect.to('db');
        const { TimesheetEntry, Timesheet, AuditLog } = db.entities('sap.timesheet');

        const [entry] = await SELECT.from(TimesheetEntry).where({ ID: entryId });
        if (!entry) return req.reject(404, 'Entry not found');

        const [ts] = await SELECT.from(Timesheet).where({ ID: entry.timesheet_ID });

        // Team lead can only adjust if it's currently submitted to them
        if (ts.currentApprover_ID !== user.ID && user.role !== 'Admin') {
            return req.reject(403, 'Not authorized to adjust this entry');
        }

        const oldVal = entry.approvedHours !== null ? entry.approvedHours : entry.loggedHours;

        await UPDATE(TimesheetEntry).set({
            approvedHours: approvedHours,
            hoursModifiedBy_ID: user.ID,
            hoursModifiedAt: new Date().toISOString()
        }).where({ ID: entryId });

        await INSERT.into(AuditLog).entries({
            entity_: 'TimesheetEntry',
            entityId: entryId,
            action: 'Updated',
            userId: user.ID,
            changes: JSON.stringify({ field: 'approvedHours', old: oldVal, new: approvedHours })
        });

        return 'Entry hours adjusted successfully';
    }

    // ── createBatch ──
    private async onCreateBatch(req: any) {
        const { timesheetIds, adminId } = req.data;
        const user = await resolveUser(req);
        if (!user) return req.reject(401, 'User not found');

        const db = cds.db || await cds.connect.to('db');
        const { Timesheet, TimesheetBatch, BatchHistory, User } = db.entities('sap.timesheet');

        if (!timesheetIds || timesheetIds.length === 0) {
            return req.reject(400, 'No timesheets provided');
        }

        // Check Admin
        const [admin] = await SELECT.from(User).where({ ID: adminId, role: 'Admin' });
        if (!admin) return req.reject(400, 'Invalid admin designated for the batch');

        // Check if all timesheets are 'Approved'
        const timesheets = await SELECT.from(Timesheet).where({ ID: { 'in': timesheetIds } });
        for (const ts of timesheets) {
            if (ts.status !== 'Approved') {
                return req.reject(400, `Timesheet ${ts.ID} is not approved yet (Status: ${ts.status})`);
            }
            if (ts.batch_ID) {
                return req.reject(400, `Timesheet ${ts.ID} is already in a batch`);
            }
        }

        // Create Batch
        const batchId = cds.utils.uuid();
        await INSERT.into(TimesheetBatch).entries({
            ID: batchId,
            teamLead_ID: user.ID,
            admin_ID: adminId,
            status: 'Pending'
        });

        await INSERT.into(BatchHistory).entries({
            batch_ID: batchId,
            actor_ID: user.ID,
            action: 'Created',
            status: 'Pending',
            comment: `Batch created with ${timesheets.length} timesheets`,
            timestamp: new Date().toISOString()
        });

        // Assign to Batch & update currentApprover to Admin
        await UPDATE(Timesheet).set({
            batch_ID: batchId,
            currentApprover_ID: adminId
        }).where({ ID: { 'in': timesheetIds } });

        return `Batch ${batchId} created and forwarded to Admin successfully`;
    }
}
