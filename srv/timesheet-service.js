const cds = require('@sap/cds')

module.exports = cds.service.impl(async function () {
    const { Projects, Timesheets, TimesheetEntries } = this.entities

    /**
     * Resolve user from DB by trying: UUID → email → username@example.com pattern
     * Supports x-mock-user header for frontend user switching in dev.
     */
    async function resolveUser(req) {
        const mockUserId = req.headers?.['x-mock-user']
        const userId = mockUserId || req.user.id
        const db = cds.db || await cds.connect.to('db')
        const { User } = db.entities('sap.timesheet')

        let [user] = await SELECT.from(User).where({ ID: userId })
        if (!user) {
            [user] = await SELECT.from(User).where({ email: userId })
        }
        if (!user) {
            const email = `${userId}@example.com`
                ;[user] = await SELECT.from(User).where({ email })
        }
        return user
    }

    // --- userInfo: return the effective user profile ---
    this.on('userInfo', async (req) => {
        const user = await resolveUser(req)
        if (!user) {
            return req.reject(404, `User not found`)
        }
        return {
            id: user.ID,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
        }
    })

    // Auto-set user_ID on project creation based on effective user
    this.before('CREATE', Projects, async (req) => {
        const user = await resolveUser(req)
        if (!user) {
            const userId = req.headers?.['x-mock-user'] || req.user.id
            const db = cds.db || await cds.connect.to('db')
            const { User } = db.entities('sap.timesheet')
            // Auto-create if not exists (dev convenience)
            await INSERT.into(User).entries({
                email: `${userId}@example.com`,
                firstName: userId,
                lastName: 'User',
                role: 'Employee',
                isActive: true,
            })
            const [newUser] = await SELECT.from(User).where({ email: `${userId}@example.com` })
            req.data.user_ID = newUser.ID
        } else {
            req.data.user_ID = user.ID
        }
    })

    // Filter projects to only show effective user's projects
    this.before('READ', Projects, async (req) => {
        const user = await resolveUser(req)
        if (user) {
            if (!req.query.SELECT.where) {
                req.query.SELECT.where = []
            } else {
                req.query.SELECT.where.push('and')
            }
            req.query.SELECT.where.push(
                { ref: ['user_ID'] }, '=', { val: user.ID }
            )
        }
    })

    // Filter timesheets: show user's own OR timesheets where user is currentApprover
    this.before('READ', Timesheets, async (req) => {
        const user = await resolveUser(req)
        if (user) {
            if (!req.query.SELECT.where) {
                req.query.SELECT.where = []
            } else {
                req.query.SELECT.where.push('and')
            }
            // Show own timesheets OR timesheets where this user is the current approver
            req.query.SELECT.where.push(
                '(',
                { ref: ['user_ID'] }, '=', { val: user.ID },
                'or',
                { ref: ['currentApprover_ID'] }, '=', { val: user.ID },
                ')'
            )
        }
    })

    // ── Draft/Rejected enforcement for TimesheetEntries ─────────────────────
    async function assertTimesheetIsEditable(req) {
        const db = cds.db || await cds.connect.to('db')
        const { Timesheet } = db.entities('sap.timesheet')

        let timesheetId = req.data?.timesheet_ID
        if (!timesheetId && req.params?.[0]) {
            const { TimesheetEntry } = db.entities('sap.timesheet')
            const entryId = typeof req.params[0] === 'object' ? req.params[0].ID : req.params[0]
            const [entry] = await SELECT.from(TimesheetEntry).where({ ID: entryId })
            if (entry) timesheetId = entry.timesheet_ID
        }
        if (!timesheetId) return

        const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId })
        if (ts && ts.status !== 'Draft' && ts.status !== 'Rejected') {
            return req.reject(403, `Cannot modify entries – timesheet is "${ts.status}". Only Draft or Rejected timesheets can be edited.`)
        }
    }

    this.before(['CREATE'], TimesheetEntries, assertTimesheetIsEditable)
    this.before(['UPDATE'], TimesheetEntries, assertTimesheetIsEditable)
    this.before(['DELETE'], TimesheetEntries, assertTimesheetIsEditable)

    // ══════════════════════════════════════════════════════════════════════════
    // WORKFLOW ACTIONS
    // ══════════════════════════════════════════════════════════════════════════

    // ── submitTimesheet ──────────────────────────────────────────────────────
    this.on('submitTimesheet', async (req) => {
        const { timesheetId, approverId } = req.data
        const db = cds.db || await cds.connect.to('db')
        const { Timesheet, ApprovalHistory } = db.entities('sap.timesheet')

        const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId })
        if (!ts) return req.reject(404, 'Timesheet not found')
        if (ts.status !== 'Draft' && ts.status !== 'Rejected') {
            return req.reject(400, `Cannot submit – status is "${ts.status}"`)
        }

        const updateData = {
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
    })

    // ── approveTimesheet ─────────────────────────────────────────────────────
    this.on('approveTimesheet', async (req) => {
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
        let newStatus
        if (user.role === 'Admin' || user.role === 'Manager') {
            newStatus = 'Finished'
        } else {
            newStatus = 'Approved'
        }

        const updateData = {
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
    })

    // ── rejectTimesheet ──────────────────────────────────────────────────────
    this.on('rejectTimesheet', async (req) => {
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
    })

    // ── finishTimesheet ──────────────────────────────────────────────────────
    this.on('finishTimesheet', async (req) => {
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
    })

    // ── submitToAdmin ────────────────────────────────────────────────────────
    // Team Lead forwards an Approved timesheet to an Admin for final sign-off
    this.on('submitToAdmin', async (req) => {
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
    })

    // ── modifyEntryHours ─────────────────────────────────────────────────────
    this.on('modifyEntryHours', async (req) => {
        const { entryId, approvedHours } = req.data
        const user = await resolveUser(req)
        if (!user) return req.reject(401, 'User not found')

        if (user.role !== 'TeamLead' && user.role !== 'Admin' && user.role !== 'Manager') {
            return req.reject(403, 'Only Team Leads or Admin can modify hours')
        }

        const db = cds.db || await cds.connect.to('db')
        const { TimesheetEntry } = db.entities('sap.timesheet')

        const [entry] = await SELECT.from(TimesheetEntry).where({ ID: entryId })
        if (!entry) return req.reject(404, 'Entry not found')

        await UPDATE(TimesheetEntry).set({
            approvedHours: approvedHours,
            hoursModifiedBy_ID: user.ID,
            hoursModifiedAt: new Date().toISOString(),
        }).where({ ID: entryId })

        return 'Hours modified successfully'
    })

    // ── getApprovableTimesheets ──────────────────────────────────────────────
    this.on('getApprovableTimesheets', async (req) => {
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
            const totalHours = entries.reduce((sum, e) => sum + (Number(e.loggedHours) || 0), 0)

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
    })
})
