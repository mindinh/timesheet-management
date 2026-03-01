import cds from '@sap/cds'
import { resolveUser } from '../../lib/user-resolver'

export class AdminBatchHandler {
    private srv: any

    constructor(srv: any) {
        this.srv = srv
    }

    register() {
        this.srv.on('markBatchDone', this.onMarkBatchDone.bind(this))
        this.srv.on('rejectBatch', this.onRejectBatch.bind(this))
    }

    // ── markBatchDone ────────────────────────────────────────────────────────
    private async onMarkBatchDone(req: any) {
        const { batchId } = req.data as { batchId: string }

        if (!batchId) return req.reject(400, 'batchId is required')

        const admin = await resolveUser(req)
        if (!admin) return req.reject(401, 'Admin user not found')

        const db = cds.db || await cds.connect.to('db')
        const { TimesheetBatch, Timesheet, ApprovalHistory, BatchHistory } = db.entities('sap.timesheet')

        const [batch] = await SELECT.from(TimesheetBatch).where({ ID: batchId })
        if (!batch) return req.reject(404, 'Batch not found')

        if (batch.status !== 'Pending') {
            return req.reject(400, `Cannot mark batch done – status is "${batch.status}"`)
        }

        // 1. Get all timesheets in the batch
        const timesheets = await SELECT.from(Timesheet).where({ batch_ID: batchId, status: 'Approved' })

        if (timesheets.length === 0) {
            return req.reject(400, 'No Approved timesheets found in this batch')
        }

        // 2. Update all timesheets to Finished
        const now = new Date().toISOString()

        await UPDATE(Timesheet)
            .set({
                status: 'Finished',
                finishedDate: now,
                comment: 'Batch marked as done by admin'
            })
            .where({ batch_ID: batchId, status: 'Approved' })

        // 3. Insert history records for all updated timesheets
        const historyEntries = timesheets.map((ts: any) => ({
            timesheet_ID: ts.ID,
            actor_ID: admin.ID,
            action: 'Finished',
            fromStatus: 'Approved',
            toStatus: 'Finished',
            comment: 'Batch marked as done',
            timestamp: now
        }))

        if (historyEntries.length > 0) {
            await INSERT.into(ApprovalHistory).entries(historyEntries)
        }

        // 4. Update the Batch status itself
        await UPDATE(TimesheetBatch).set({ status: 'Processed' }).where({ ID: batchId })

        // 5. Log batch history
        await INSERT.into(BatchHistory).entries({
            batch_ID: batchId,
            actor_ID: admin.ID,
            action: 'Finished',
            status: 'Processed',
            comment: 'Batch marked as done by admin',
            timestamp: now
        })

        return `Batch marked as done. ${timesheets.length} timesheets finished.`
    }

    // ── rejectBatch ──────────────────────────────────────────────────────────
    private async onRejectBatch(req: any) {
        const { batchId, comment } = req.data as { batchId: string, comment: string }

        if (!batchId) return req.reject(400, 'batchId is required')
        if (!comment?.trim()) return req.reject(400, 'comment (rejection reason) is required')

        const admin = await resolveUser(req)
        if (!admin) return req.reject(401, 'Admin user not found')

        const db = cds.db || await cds.connect.to('db')
        const { TimesheetBatch, Timesheet, ApprovalHistory, BatchHistory } = db.entities('sap.timesheet')

        const [batch] = await SELECT.from(TimesheetBatch).where({ ID: batchId })
        if (!batch) return req.reject(404, 'Batch not found')

        if (batch.status !== 'Pending') {
            return req.reject(400, `Cannot reject batch – status is "${batch.status}"`)
        }

        // 1. Get all timesheets in the batch (they should be 'Approved')
        const timesheets = await SELECT.from(Timesheet).where({ batch_ID: batchId })

        if (timesheets.length === 0) {
            return req.reject(400, 'No timesheets found in this batch')
        }

        const now = new Date().toISOString()

        // 2. Update timesheets to Rejected
        await UPDATE(Timesheet)
            .set({
                status: 'Rejected',
                comment: comment
            })
            .where({ batch_ID: batchId })

        // 3. Write History
        const historyEntries = timesheets.map((ts: any) => ({
            timesheet_ID: ts.ID,
            actor_ID: admin.ID,
            action: 'Rejected',
            fromStatus: ts.status,
            toStatus: 'Rejected',
            comment: `Batch Rejected: ${comment}`,
            timestamp: now
        }))

        if (historyEntries.length > 0) {
            await INSERT.into(ApprovalHistory).entries(historyEntries)
        }

        // 4. Update Batch status
        await UPDATE(TimesheetBatch).set({ status: 'Rejected' }).where({ ID: batchId })

        // 5. Log batch history
        await INSERT.into(BatchHistory).entries({
            batch_ID: batchId,
            actor_ID: admin.ID,
            action: 'Rejected',
            status: 'Rejected',
            comment: comment,
            timestamp: now
        })

        return `Batch rejected. ${timesheets.length} timesheets marked as Rejected.`
    }
}
