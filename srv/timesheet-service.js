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

    // Filter timesheets to only show effective user's timesheets
    this.before('READ', Timesheets, async (req) => {
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

    // ── Draft-only enforcement for TimesheetEntries ──────────────────────────
    // Helper: check parent timesheet is Draft
    async function assertTimesheetIsDraft(req) {
        const db = cds.db || await cds.connect.to('db')
        const { Timesheet } = db.entities('sap.timesheet')

        let timesheetId = req.data?.timesheet_ID
        if (!timesheetId && req.params?.[0]) {
            // For UPDATE/DELETE by entry ID, look up the parent
            const { TimesheetEntry } = db.entities('sap.timesheet')
            const entryId = typeof req.params[0] === 'object' ? req.params[0].ID : req.params[0]
            const [entry] = await SELECT.from(TimesheetEntry).where({ ID: entryId })
            if (entry) timesheetId = entry.timesheet_ID
        }
        if (!timesheetId) return // No timesheet context, skip

        const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId })
        if (ts && ts.status !== 'Draft') {
            return req.reject(403, `Cannot modify entries – timesheet is "${ts.status}". Only Draft timesheets can be edited.`)
        }
    }

    this.before(['CREATE'], TimesheetEntries, assertTimesheetIsDraft)
    this.before(['UPDATE'], TimesheetEntries, assertTimesheetIsDraft)
    this.before(['DELETE'], TimesheetEntries, assertTimesheetIsDraft)

    // ── submitTimesheet action ───────────────────────────────────────────────
    this.on('submitTimesheet', async (req) => {
        const { timesheetId } = req.data
        const db = cds.db || await cds.connect.to('db')
        const { Timesheet } = db.entities('sap.timesheet')

        const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId })
        if (!ts) return req.reject(404, 'Timesheet not found')
        if (ts.status !== 'Draft') return req.reject(400, `Cannot submit – status is "${ts.status}"`)

        await UPDATE(Timesheet).set({
            status: 'Submitted',
            submitDate: new Date().toISOString(),
        }).where({ ID: timesheetId })

        return 'Timesheet submitted successfully'
    })
})

