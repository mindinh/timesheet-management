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
        this.srv.on('reopenForEdit', this.onReopenForEdit.bind(this));
        this.srv.on('bulkApproveTimesheets', this.onBulkApproveTimesheets.bind(this));
        this.srv.on('bulkReopenForEdit', this.onBulkReopenForEdit.bind(this));
        this.srv.on('modifyEntryHours', this.onModifyEntryHours.bind(this));
        this.srv.on('reviewEntry', this.onReviewEntry.bind(this));
        this.srv.on('createBatch', this.onCreateBatch.bind(this));

        this.srv.on('getMyMembers', this.onGetMyMembers.bind(this));
        this.srv.on('assignMember', this.onAssignMember.bind(this));
        this.srv.on('removeMember', this.onRemoveMember.bind(this));
        this.srv.on('getUnassignedEmployees', this.onGetUnassignedEmployees.bind(this));
        this.srv.on('createMember', this.onCreateMember.bind(this));
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
            .where({ currentApprover_ID: user.ID, status: { 'in': ['Submitted', 'Approved'] } })
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

    // ── reopenForEdit ──
    private async onReopenForEdit(req: any) {
        const { timesheetId, comment } = req.data;
        return this.processApproval(req, timesheetId, 'Reopened', comment);
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

    // ── bulkReopenForEdit ──
    private async onBulkReopenForEdit(req: any) {
        const { timesheetIds, comment } = req.data;
        let count = 0;
        for (const id of timesheetIds) {
            try {
                await this.processApproval(req, id, 'Reopened', comment);
                count++;
            } catch (err: any) {
                req.warn(400, `Failed to reopen ${id}: ${err.message}`);
            }
        }
        return `Successfully reopened ${count} timesheets for edit`;
    }

    // ── Internal Action Processor ──
    private async processApproval(req: any, timesheetId: string, action: 'Approved' | 'Reopened', comment?: string) {
        const user = await resolveUser(req);
        if (!user) throw new Error('User not found');

        const db = cds.db || await cds.connect.to('db');
        const { Timesheet, ApprovalHistory } = db.entities('sap.timesheet');

        const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId });
        if (!ts) throw new Error('Timesheet not found');

        if (ts.currentApprover_ID !== user.ID && user.role !== 'Admin') {
            throw new Error('Not authorized to approve/reject this timesheet');
        }

        // If already in the target status, gracefully skip
        if (ts.status === action && action === 'Approved') {
            return `Timesheet is already ${action.toLowerCase()}`;
        }

        if (ts.status !== 'Submitted' && ts.status !== 'Approved') {
            throw new Error(`Cannot change status from "${ts.status}"`);
        }

        if (action === 'Reopened' && !comment?.trim()) {
            throw new Error('A reason is required when reopening a timesheet for edit.');
        }

        const updateData: any = {
            status: action,
            comment: comment || ts.comment,
            approveDate: action === 'Approved' ? new Date().toISOString() : null
        };

        if (action === 'Approved') {
            const { TimesheetEntry } = db.entities('sap.timesheet');
            const entries = await SELECT.from(TimesheetEntry).where({ timesheet_ID: timesheetId });
            let totalHrs = 0;
            for (const e of entries) {
                totalHrs += (e.approvedHours !== null && e.approvedHours !== undefined) ? Number(e.approvedHours) : (Number(e.loggedHours) || 0);
            }
            updateData.totalHours = totalHrs;
            updateData.mainDays = Number((totalHrs / 8).toFixed(2));
        }

        if (action === 'Reopened') {
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

        // Recalculate total hours and mainDays for the timesheet
        const entries = await SELECT.from(TimesheetEntry).where({ timesheet_ID: ts.ID });
        let totalHrs = 0;
        for (const e of entries) {
            totalHrs += (e.approvedHours !== null && e.approvedHours !== undefined) ? Number(e.approvedHours) : (Number(e.loggedHours) || 0);
        }
        await UPDATE(Timesheet).set({
            totalHours: totalHrs,
            mainDays: Number((totalHrs / 8).toFixed(2))
        }).where({ ID: ts.ID });

        await INSERT.into(AuditLog).entries({
            entity_: 'TimesheetEntry',
            entityId: entryId,
            action: 'Updated',
            userId: user.ID,
            changes: JSON.stringify({ field: 'approvedHours', old: oldVal, new: approvedHours })
        });

        return 'Entry hours adjusted successfully';
    }

    // ── reviewEntry ──
    private async onReviewEntry(req: any) {
        const { entryId, status, approvedHours, approverComment } = req.data;
        const user = await resolveUser(req);
        if (!user) return req.reject(401, 'User not found');

        const db = cds.db || await cds.connect.to('db');
        const { TimesheetEntry, Timesheet, AuditLog } = db.entities('sap.timesheet');

        const [entry] = await SELECT.from(TimesheetEntry).where({ ID: entryId });
        if (!entry) return req.reject(404, 'Entry not found');

        const [ts] = await SELECT.from(Timesheet).where({ ID: entry.timesheet_ID });

        // Team lead can only adjust if it's currently submitted to them
        if (ts.currentApprover_ID !== user.ID && user.role !== 'Admin') {
            return req.reject(403, 'Not authorized to review this entry');
        }

        const oldVal = entry.approvedHours !== null ? entry.approvedHours : entry.loggedHours;
        const oldStatus = entry.status;
        const oldComment = entry.approverComment;

        await UPDATE(TimesheetEntry).set({
            approvedHours: approvedHours,
            status: status || entry.status,
            approverComment: approverComment !== undefined ? approverComment : entry.approverComment,
            hoursModifiedBy_ID: user.ID,
            hoursModifiedAt: new Date().toISOString()
        }).where({ ID: entryId });

        // Recalculate total hours and mainDays for the timesheet
        const entries = await SELECT.from(TimesheetEntry).where({ timesheet_ID: ts.ID });
        let totalHrs = 0;
        for (const e of entries) {
            totalHrs += (e.approvedHours !== null && e.approvedHours !== undefined) ? Number(e.approvedHours) : (Number(e.loggedHours) || 0);
        }
        await UPDATE(Timesheet).set({
            totalHours: totalHrs,
            mainDays: Number((totalHrs / 8).toFixed(2))
        }).where({ ID: ts.ID });

        await INSERT.into(AuditLog).entries({
            entity_: 'TimesheetEntry',
            entityId: entryId,
            action: 'Reviewed',
            userId: user.ID,
            changes: JSON.stringify({
                field: 'review',
                old: { status: oldStatus, hours: oldVal, comment: oldComment },
                new: { status, hours: approvedHours, comment: approverComment }
            })
        });

        return 'Entry reviewed successfully';
    }

    // ── submitBatch ──
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

        // Check if all timesheets are valid
        const timesheets = await SELECT.from(Timesheet).where({ ID: { 'in': timesheetIds } });
        const batchIdsToUpdate = new Set<string>();

        for (const ts of timesheets) {
            if (ts.status !== 'Approved' && ts.status !== 'Submitted') {
                return req.reject(400, `Timesheet ${ts.ID} has invalid status (Status: ${ts.status})`);
            }
            if (!ts.batch_ID) {
                return req.reject(400, `Timesheet ${ts.ID} does not belong to a batch. It must be re-submitted.`);
            }
            batchIdsToUpdate.add(ts.batch_ID);
        }

        const now = new Date().toISOString();

        // Update Existing Batches
        for (const batchId of batchIdsToUpdate) {
            await UPDATE(TimesheetBatch).set({
                admin_ID: adminId,
                status: 'SubmittedToAdmin'
            }).where({ ID: batchId });

            await INSERT.into(BatchHistory).entries({
                batch_ID: batchId,
                actor_ID: user.ID,
                action: 'SubmittedToAdmin',
                status: 'SubmittedToAdmin',
                comment: `Batch submitted to Admin`,
                timestamp: now
            });
        }

        // Log approvals if they were submitted and auto-approve
        for (const ts of timesheets) {
            if (ts.status === 'Submitted') {
                await INSERT.into('sap.timesheet.ApprovalHistory').entries({
                    timesheet_ID: ts.ID,
                    actor_ID: user.ID,
                    action: 'Approved',
                    fromStatus: 'Submitted',
                    toStatus: 'Approved',
                    comment: 'Auto-approved during batch submission',
                    timestamp: now,
                });
            }
        }

        // Update currentApprover to Admin, and status to Approved
        await UPDATE(Timesheet).set({
            status: 'Approved',
            approveDate: now,
            currentApprover_ID: adminId
        }).where({ ID: { 'in': timesheetIds } });

        return `Successfully submitted ${timesheets.length} timesheets to Admin across ${batchIdsToUpdate.size} batches.`;
    }

    // ── Team Management ──

    private async onGetMyMembers(req: any) {
        const user = await resolveUser(req);
        if (!user) return req.reject(401, 'User not found');

        const db = cds.db || await cds.connect.to('db');
        const { User } = db.entities('sap.timesheet');

        return await SELECT.from(User).where({ manager_ID: user.ID });
    }

    private async onGetUnassignedEmployees(req: any) {
        const user = await resolveUser(req);
        if (!user) return req.reject(401, 'User not found');

        const db = cds.db || await cds.connect.to('db');
        const { User } = db.entities('sap.timesheet');

        return await SELECT.from(User).where({ manager_ID: null, role: 'Employee' });
    }

    private async onAssignMember(req: any) {
        const { memberId } = req.data;
        const user = await resolveUser(req);
        if (!user) return req.reject(401, 'User not found');

        const db = cds.db || await cds.connect.to('db');
        const { User } = db.entities('sap.timesheet');

        const [member] = await SELECT.from(User).where({ ID: memberId });
        if (!member) return req.reject(404, 'Employee not found');

        if (member.manager_ID && member.manager_ID !== user.ID) {
            const [otherManager] = await SELECT.from(User).where({ ID: member.manager_ID });
            const managerName = otherManager ? `${otherManager.firstName} ${otherManager.lastName}` : 'another Team Lead';
            return req.reject(409, `Employee belongs to ${managerName}`);
        }

        await UPDATE(User).set({ manager_ID: user.ID }).where({ ID: memberId });
        return 'Member assigned successfully';
    }

    private async onRemoveMember(req: any) {
        const { memberId } = req.data;
        const user = await resolveUser(req);
        if (!user) return req.reject(401, 'User not found');

        const db = cds.db || await cds.connect.to('db');
        const { User } = db.entities('sap.timesheet');

        const [member] = await SELECT.from(User).where({ ID: memberId });
        if (!member) return req.reject(404, 'Employee not found');

        if (member.manager_ID !== user.ID) {
            return req.reject(403, 'Employee is not in your team');
        }

        await UPDATE(User).set({ manager_ID: null }).where({ ID: memberId });
        return 'Member removed successfully';
    }

    private async onCreateMember(req: any) {
        const { firstName, lastName, email } = req.data;
        const user = await resolveUser(req);
        if (!user) return req.reject(401, 'User not found');

        const db = cds.db || await cds.connect.to('db');
        const { User } = db.entities('sap.timesheet');

        // validate email unique
        const [existing] = await SELECT.from(User).where({ email });
        if (existing) {
            return req.reject(400, 'Email already exists');
        }

        const newId = cds.utils.uuid();
        await INSERT.into(User).entries({
            ID: newId,
            firstName,
            lastName,
            email,
            role: 'Employee',
            isActive: true,
            manager_ID: user.ID
        });

        return 'Member created and assigned successfully';
    }
}
