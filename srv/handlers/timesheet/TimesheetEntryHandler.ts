import cds from '@sap/cds'
import { resolveUser } from '../../lib/user-resolver'

/**
 * TimesheetEntryHandler
 * Handles entry-level operations: draft enforcement and hours modification.
 */
export class TimesheetEntryHandler {
    private srv: any

    constructor(srv: any) {
        this.srv = srv
    }

    register() {
        const { TimesheetEntries } = this.srv.entities

        // ── Draft/Rejected enforcement for TimesheetEntries ──
        this.srv.before(['CREATE'], TimesheetEntries, this.assertTimesheetIsEditable)
        this.srv.before(['UPDATE'], TimesheetEntries, this.assertTimesheetIsEditable)
        this.srv.before(['DELETE'], TimesheetEntries, this.assertTimesheetIsEditable)

        // ── modifyEntryHours ──
        this.srv.on('modifyEntryHours', async (req: any) => {
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
    }

    private async assertTimesheetIsEditable(req: any) {
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
}
