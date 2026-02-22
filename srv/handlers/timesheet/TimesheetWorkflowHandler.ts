import cds from '@sap/cds'
import { resolveUser } from '../../lib/user-resolver'

/**
 * TimesheetWorkflowHandler
 * Handles all workflow state transitions and approval queries.
 */
export class TimesheetWorkflowHandler {
    private srv: any

    constructor(srv: any) {
        this.srv = srv
    }

    register() {
        this.srv.on('submitTimesheet', this.onSubmitTimesheet.bind(this))
        this.srv.on('approveTimesheet', this.onApproveTimesheet.bind(this))
        this.srv.on('rejectTimesheet', this.onRejectTimesheet.bind(this))
        this.srv.on('finishTimesheet', this.onFinishTimesheet.bind(this))
        this.srv.on('submitToAdmin', this.onSubmitToAdmin.bind(this))
        this.srv.on('getApprovableTimesheets', this.onGetApprovableTimesheets.bind(this))
    }

    // ── submitTimesheet ──
    private async onSubmitTimesheet(req: any) {
        const { timesheetId, approverId } = req.data
        const db = cds.db || await cds.connect.to('db')
        const { Timesheet, ApprovalHistory } = db.entities('sap.timesheet')

        const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId })
        if (!ts) return req.reject(404, 'Timesheet not found')
        if (ts.status !== 'Draft' && ts.status !== 'Rejected') {
            return req.reject(400, `Cannot submit – status is "${ts.status}"`)
        }

        const updateData: any = {
            status: 'Submitted',
            submitDate: new Date().toISOString(),
        }
        if (approverId) {
            updateData.currentApprover_ID = approverId
        }

        await UPDATE(Timesheet).set(updateData).where({ ID: timesheetId })

        await INSERT.into(ApprovalHistory).entries({
            timesheet_ID: timesheetId,
            actor_ID: ts.user_ID,
            action: 'Submitted',
            fromStatus: ts.status,
            toStatus: 'Submitted',
            timestamp: new Date().toISOString(),
        })

        return 'Timesheet submitted successfully'
    }

    // ── approveTimesheet ──
    private async onApproveTimesheet(req: any) {
        const { timesheetId, comment } = req.data
        const user = await resolveUser(req)
        if (!user) return req.reject(401, 'User not found')

        const db = cds.db || await cds.connect.to('db')
        const { Timesheet, ApprovalHistory } = db.entities('sap.timesheet')

        const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId })
        if (!ts) return req.reject(404, 'Timesheet not found')

        if (ts.currentApprover_ID !== user.ID) {
            return req.reject(403, 'You are not the designated approver for this timesheet')
        }

        if (ts.status !== 'Submitted') {
            return req.reject(400, `Cannot approve – status is "${ts.status}"`)
        }

        // Admin/Manager → Finished; TeamLead → Approved
        let newStatus: string
        if (user.role === 'Admin' || user.role === 'Manager') {
            newStatus = 'Finished'
        } else {
            newStatus = 'Approved'
        }

        const updateData: any = {
            status: newStatus,
            approveDate: new Date().toISOString(),
            comment: comment || ts.comment,
        }
        if (newStatus === 'Finished') {
            updateData.finishedDate = new Date().toISOString()
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

        return `Timesheet ${newStatus === 'Finished' ? 'finished' : 'approved'} successfully`
    }

    // ── rejectTimesheet ──
    private async onRejectTimesheet(req: any) {
        const { timesheetId, comment } = req.data
        const user = await resolveUser(req)
        if (!user) return req.reject(401, 'User not found')

        const db = cds.db || await cds.connect.to('db')
        const { Timesheet, ApprovalHistory } = db.entities('sap.timesheet')

        const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId })
        if (!ts) return req.reject(404, 'Timesheet not found')

        if (ts.currentApprover_ID !== user.ID) {
            return req.reject(403, 'You are not the designated approver for this timesheet')
        }

        if (ts.status !== 'Submitted' && ts.status !== 'Approved') {
            return req.reject(400, `Cannot reject – status is "${ts.status}"`)
        }

        await UPDATE(Timesheet).set({
            status: 'Rejected',
            comment: comment || null,
        }).where({ ID: timesheetId })

        await INSERT.into(ApprovalHistory).entries({
            timesheet_ID: timesheetId,
            actor_ID: user.ID,
            action: 'Rejected',
            fromStatus: ts.status,
            toStatus: 'Rejected',
            comment: comment || null,
            timestamp: new Date().toISOString(),
        })

        return 'Timesheet rejected'
    }

    // ── finishTimesheet ──
    private async onFinishTimesheet(req: any) {
        const { timesheetId } = req.data
        const user = await resolveUser(req)
        if (!user) return req.reject(401, 'User not found')

        if (user.role !== 'Admin' && user.role !== 'Manager') {
            return req.reject(403, 'Only Admin/Manager can finish timesheets')
        }

        const db = cds.db || await cds.connect.to('db')
        const { Timesheet, ApprovalHistory } = db.entities('sap.timesheet')

        const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId })
        if (!ts) return req.reject(404, 'Timesheet not found')

        if (ts.status !== 'Approved' && ts.status !== 'Submitted') {
            return req.reject(400, `Cannot finish – status is "${ts.status}"`)
        }

        await UPDATE(Timesheet).set({
            status: 'Finished',
            finishedDate: new Date().toISOString(),
        }).where({ ID: timesheetId })

        await INSERT.into(ApprovalHistory).entries({
            timesheet_ID: timesheetId,
            actor_ID: user.ID,
            action: 'Finished',
            fromStatus: ts.status,
            toStatus: 'Finished',
            timestamp: new Date().toISOString(),
        })

        return 'Timesheet finished'
    }

    // ── submitToAdmin ──
    // Team Lead forwards an Approved timesheet to an Admin for final sign-off
    private async onSubmitToAdmin(req: any) {
        const { timesheetId, adminId } = req.data
        const user = await resolveUser(req)
        if (!user) return req.reject(401, 'User not found')

        const db = cds.db || await cds.connect.to('db')
        const { Timesheet, ApprovalHistory, User } = db.entities('sap.timesheet')

        const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId })
        if (!ts) return req.reject(404, 'Timesheet not found')

        if (ts.status !== 'Approved') {
            return req.reject(400, `Cannot submit to admin – status is "${ts.status}". Must be Approved first.`)
        }

        // Verify the target is an Admin
        const [admin] = await SELECT.from(User).where({ ID: adminId })
        if (!admin || (admin.role !== 'Admin' && admin.role !== 'Manager')) {
            return req.reject(400, 'Selected user is not an Admin')
        }

        await UPDATE(Timesheet).set({
            status: 'Submitted',
            currentApprover_ID: adminId,
        }).where({ ID: timesheetId })

        await INSERT.into(ApprovalHistory).entries({
            timesheet_ID: timesheetId,
            actor_ID: user.ID,
            action: 'Submitted_To_Admin',
            fromStatus: 'Approved',
            toStatus: 'Submitted',
            timestamp: new Date().toISOString(),
        })

        return 'Timesheet submitted to admin for final approval'
    }

    // ── getApprovableTimesheets ──
    private async onGetApprovableTimesheets(req: any) {
        const user = await resolveUser(req)
        if (!user) return req.reject(401, 'User not found')

        const db = cds.db || await cds.connect.to('db')
        const { Timesheet, TimesheetEntry, User } = db.entities('sap.timesheet')

        // Fetch timesheets where this user is the current approver
        const timesheets = await SELECT.from(Timesheet)
            .where({ currentApprover_ID: user.ID })
            .orderBy('submitDate desc')

        // Enrich with user info and total hours
        const enriched = []
        for (const ts of timesheets) {
            const [tsUser] = await SELECT.from(User).where({ ID: ts.user_ID })
            const entries = await SELECT.from(TimesheetEntry).where({ timesheet_ID: ts.ID })
            const totalHours = entries.reduce((sum: number, e: any) => sum + (Number(e.loggedHours) || 0), 0)

            enriched.push({
                ...ts,
                id: ts.ID,
                totalHours,
                user: tsUser ? {
                    id: tsUser.ID,
                    firstName: tsUser.firstName,
                    lastName: tsUser.lastName,
                    email: tsUser.email,
                    role: tsUser.role,
                } : null,
            })
        }

        return enriched
    }
}
