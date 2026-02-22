import cds from '@sap/cds'
import { resolveUser } from '../../lib/user-resolver'

/**
 * TimesheetExportHandler
 * Handles Excel export functionality for the Timesheet service.
 */
export class TimesheetExportHandler {
    private srv: any

    constructor(srv: any) {
        this.srv = srv
    }

    register() {
        this.srv.on('exportToExcel', this.onExportToExcel.bind(this))
    }

    // ── exportToExcel ──
    private async onExportToExcel(req: any) {
        const { timesheetId } = req.data
        if (!timesheetId) return req.reject(400, 'timesheetId is required')

        const user = await resolveUser(req)
        if (!user) return req.reject(401, 'User not found')

        const db = cds.db || await cds.connect.to('db')
        const { Timesheet, TimesheetEntry, Project, Task } = db.entities('sap.timesheet')

        // Fetch timesheet
        const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId })
        if (!ts) return req.reject(404, 'Timesheet not found')

        // Only owner or current approver may export
        if (ts.user_ID !== user.ID && ts.currentApprover_ID !== user.ID) {
            return req.reject(403, 'You do not have access to export this timesheet')
        }

        // Fetch entries with project & task info
        const rawEntries = await SELECT.from(TimesheetEntry).where({ timesheet_ID: timesheetId })
        const entries = []
        for (const e of rawEntries) {
            let project = null
            let task = null
            if (e.project_ID) {
                ;[project] = await SELECT.from(Project).where({ ID: e.project_ID })
            }
            if (e.task_ID) {
                ;[task] = await SELECT.from(Task).where({ ID: e.task_ID })
            }
            entries.push({ ...e, project, task })
        }

        // Generate Excel
        const { generateTimesheetExcel } = require('../lib/utils/ExcelService')
        const buffer = await generateTimesheetExcel({
            timesheet: ts,
            user,
            entries,
        })

        // Build a file name
        const monthLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][(ts.month || 1) - 1]
        const fileName = `Timesheet_${user.lastName || 'User'}_${monthLabel}_${ts.year}.xlsx`

        // Return as binary stream
        req.res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': buffer.length,
        })
        req.res.status(200).send(buffer)
    }
}
