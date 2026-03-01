import cds from '@sap/cds'
import { resolveUser } from '../../lib/user-resolver'

/**
 * TimesheetBulkHandler
 *
 * Handles bulk approve and bulk reject operations for Team Lead / Admin.
 * Each timesheet is processed individually so partial failures are reported clearly.
 */
export class TimesheetBulkHandler {
    private srv: any

    constructor(srv: any) {
        this.srv = srv
    }

    register() {
        this.srv.on('bulkApproveTimesheets', this.onBulkApprove.bind(this))
        this.srv.on('bulkRejectTimesheets', this.onBulkReject.bind(this))
        this.srv.on('bulkSubmitToAdmin', this.onBulkSubmitToAdmin.bind(this))
    }

    // ── Bulk Submit to Admin ──────────────────────────────────────────────────
    private async onBulkSubmitToAdmin(req: any) {
        const { timesheetIds, adminId } = req.data as { timesheetIds: string[]; adminId: string }

        if (!timesheetIds?.length) return req.reject(400, 'timesheetIds must be a non-empty array')
        if (!adminId) return req.reject(400, 'adminId is required')

        const user = await resolveUser(req)
        if (!user) return req.reject(401, 'User not found')

        if (user.role !== 'TeamLead' && user.role !== 'Admin' && user.role !== 'Manager') {
            return req.reject(403, 'Only Team Leads or Admins can submit timesheet batches to Admins')
        }

        const db = cds.db || await cds.connect.to('db')
        const { Timesheet, TimesheetBatch, ApprovalHistory, BatchHistory } = db.entities('sap.timesheet')

        const results: string[] = []
        const errors: string[] = []

        // First, verify all timesheets are ready to be submitted to an admin
        const validTimesheets: any[] = []
        for (const timesheetId of timesheetIds) {
            const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId })
            if (!ts) {
                errors.push(`${timesheetId}: not found`)
                continue
            }
            if (ts.status !== 'Approved') {
                errors.push(`${timesheetId}: cannot submit – status is "${ts.status}". Expected Approved.`)
                continue
            }
            validTimesheets.push(ts)
        }

        if (validTimesheets.length === 0) {
            return req.reject(400, `No valid timesheets to submit. Errors: ${errors.join(' | ')}`)
        }

        // Create the TimesheetBatch record
        const explicitBatchId = cds.utils.uuid()
        await INSERT.into(TimesheetBatch).entries({
            ID: explicitBatchId,
            teamLead_ID: user.ID,
            admin_ID: adminId,
            status: 'Pending'
        })

        // Log batch creation history
        await INSERT.into(BatchHistory).entries({
            batch_ID: explicitBatchId,
            actor_ID: user.ID,
            action: 'Created',
            status: 'Pending',
            comment: `Batch created with ${validTimesheets.length} timesheets`,
            timestamp: new Date().toISOString()
        })

        // Update valid timesheets and write history
        for (const ts of validTimesheets) {
            try {
                await UPDATE(Timesheet).set({
                    currentApprover_ID: adminId,
                    batch_ID: explicitBatchId
                }).where({ ID: ts.ID })

                await INSERT.into(ApprovalHistory).entries({
                    timesheet_ID: ts.ID,
                    actor_ID: user.ID,
                    action: 'SubmittedToAdmin',
                    fromStatus: ts.status,
                    toStatus: ts.status, // Remains Approved
                    comment: `Submitted to admin as part of batch`,
                    timestamp: new Date().toISOString(),
                })

                results.push(ts.ID)
            } catch (e: any) {
                errors.push(`${ts.ID}: ${e.message}`)
            }
        }

        const summary = `Bulk submit to Admin: ${results.length} succeeded, ${errors.length} failed.`
        if (errors.length) {
            return `${summary} Errors: ${errors.join(' | ')}`
        }
        return `Batch submitted successfully. ${summary}`
    }

    // ── Bulk Approve ──────────────────────────────────────────────────────────
    private async onBulkApprove(req: any) {
        const { timesheetIds, comment } = req.data as { timesheetIds: string[]; comment?: string }

        if (!timesheetIds?.length) return req.reject(400, 'timesheetIds must be a non-empty array')

        const user = await resolveUser(req)
        if (!user) return req.reject(401, 'User not found')

        if (user.role !== 'TeamLead' && user.role !== 'Admin' && user.role !== 'Manager') {
            return req.reject(403, 'Only Team Leads or Admins can bulk-approve timesheets')
        }

        const db = cds.db || await cds.connect.to('db')
        const { Timesheet, ApprovalHistory } = db.entities('sap.timesheet')

        const results: string[] = []
        const errors: string[] = []

        for (const timesheetId of timesheetIds) {
            try {
                const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId })

                if (!ts) {
                    errors.push(`${timesheetId}: not found`)
                    continue
                }

                if (ts.status !== 'Submitted') {
                    errors.push(`${timesheetId}: cannot approve – status is "${ts.status}"`)
                    continue
                }

                // New status is always Approved (we removed Finished at this step and Approved_By_TeamLead)
                const newStatus = 'Approved'

                const updateData: any = {
                    status: newStatus,
                    approveDate: new Date().toISOString(),
                    comment: comment || ts.comment,
                }

                await UPDATE(Timesheet).set(updateData).where({ ID: timesheetId })

                await INSERT.into(ApprovalHistory).entries({
                    timesheet_ID: timesheetId,
                    actor_ID: user.ID,
                    action: 'Approved',
                    fromStatus: ts.status,
                    toStatus: newStatus,
                    comment: comment || null,
                    timestamp: new Date().toISOString(),
                })

                results.push(timesheetId)
            } catch (e: any) {
                errors.push(`${timesheetId}: ${e.message}`)
            }
        }

        const summary = `Bulk approve: ${results.length} succeeded, ${errors.length} failed.`
        if (errors.length) {
            // Return partial success details
            return `${summary} Errors: ${errors.join(' | ')}`
        }
        return summary
    }

    // ── Bulk Reject ───────────────────────────────────────────────────────────
    private async onBulkReject(req: any) {
        const { timesheetIds, comment } = req.data as { timesheetIds: string[]; comment: string }

        if (!timesheetIds?.length) return req.reject(400, 'timesheetIds must be a non-empty array')
        if (!comment?.trim()) return req.reject(400, 'comment (rejection reason) is required for bulk reject')

        const user = await resolveUser(req)
        if (!user) return req.reject(401, 'User not found')

        if (user.role !== 'TeamLead' && user.role !== 'Admin' && user.role !== 'Manager') {
            return req.reject(403, 'Only Team Leads or Admins can bulk-reject timesheets')
        }

        const db = cds.db || await cds.connect.to('db')
        const { Timesheet, ApprovalHistory } = db.entities('sap.timesheet')

        const results: string[] = []
        const errors: string[] = []

        for (const timesheetId of timesheetIds) {
            try {
                const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId })

                if (!ts) {
                    errors.push(`${timesheetId}: not found`)
                    continue
                }

                if (ts.status !== 'Submitted' && ts.status !== 'Approved') {
                    errors.push(`${timesheetId}: cannot reject – status is "${ts.status}"`)
                    continue
                }

                await UPDATE(Timesheet).set({
                    status: 'Rejected',
                    comment: comment,
                }).where({ ID: timesheetId })

                await INSERT.into(ApprovalHistory).entries({
                    timesheet_ID: timesheetId,
                    actor_ID: user.ID,
                    action: 'Rejected',
                    fromStatus: ts.status,
                    toStatus: 'Rejected',
                    comment: comment,
                    timestamp: new Date().toISOString(),
                })

                results.push(timesheetId)
            } catch (e: any) {
                errors.push(`${timesheetId}: ${e.message}`)
            }
        }

        const summary = `Bulk reject: ${results.length} succeeded, ${errors.length} failed.`
        if (errors.length) {
            return `${summary} Errors: ${errors.join(' | ')}`
        }
        return summary
    }
}
