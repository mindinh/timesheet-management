import cds from '@sap/cds'
import { resolveUser } from '../../lib/user-resolver'

const ExcelService = require('../../lib/utils/ExcelService')

/**
 * AdminExportHandler
 *
 * Handles:
 *   - exportToExcel:         Full-team export with date-range / user / project filters → saves ExportLog
 *   - sendEmailToGermany:    Sends the Excel file via SMTP (requires env vars)
 *   - adminModifyEntryHours: Admin override of approved hours + AuditLog
 */
export class AdminExportHandler {
    private srv: any

    constructor(srv: any) {
        this.srv = srv
    }

    register() {
        this.srv.on('exportToExcel', this.onAdminExportToExcel.bind(this))
        this.srv.on('sendEmailToGermany', this.onSendEmailToGermany.bind(this))
        this.srv.on('adminModifyEntryHours', this.onAdminModifyEntryHours.bind(this))
    }

    // ── exportToExcel (Admin version with full filters) ───────────────────────
    private async onAdminExportToExcel(req: any) {
        const {
            month,
            year,
            userId: filterUserId,
            projectId: filterProjectId,
            from: fromStr,
            to: toStr,
        } = req.data as {
            month?: number
            year?: number
            userId?: string
            projectId?: string
            from?: string
            to?: string
        }

        if (!year) return req.reject(400, 'year is required')

        const admin = await resolveUser(req)
        if (!admin) return req.reject(401, 'Admin user not found')

        const db = cds.db || await cds.connect.to('db')
        const { Timesheet, TimesheetEntry, User, Project, Task, ExportLog } = db.entities('sap.timesheet')

        // ── Build date filter ──────────────────────────────────────────────────
        let fromDate: string
        let toDate: string

        if (fromStr && toStr) {
            fromDate = fromStr
            toDate = toStr
        } else if (month && year) {
            const lastDay = new Date(year, month, 0).getDate()
            fromDate = `${year}-${String(month).padStart(2, '0')}-01`
            toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
        } else {
            fromDate = `${year}-01-01`
            toDate = `${year}-12-31`
        }

        // ── Fetch entries ──────────────────────────────────────────────────────
        let entryQuery = SELECT.from(TimesheetEntry)
            .where(`date >= '${fromDate}' and date <= '${toDate}'`)

        const rawEntries = await entryQuery

        // Filter by project if specified
        const projectFiltered = filterProjectId
            ? rawEntries.filter((e: any) => e.project_ID === filterProjectId)
            : rawEntries

        // Cross-join timesheet to filter by user if specified
        const timesheetIds = [...new Set(projectFiltered.map((e: any) => e.timesheet_ID))]
        let timesheets: any[] = []
        if (timesheetIds.length > 0) {
            timesheets = await SELECT.from(Timesheet).where({ ID: { in: timesheetIds } })
        }

        const validTimesheetIds = filterUserId
            ? timesheets.filter((t: any) => t.user_ID === filterUserId).map((t: any) => t.ID)
            : timesheets.map((t: any) => t.ID)

        const filteredEntries = projectFiltered.filter((e: any) => validTimesheetIds.includes(e.timesheet_ID))

        if (!filteredEntries.length) {
            return req.reject(404, `No timesheet entries found for the specified period (${fromDate} – ${toDate})`)
        }

        // ── Enrich entries with user + project + task ──────────────────────────
        const allUsers = await SELECT.from(User)
        const allProjects = await SELECT.from(Project)
        const allTasks = await SELECT.from(Task)
        const tsMap = Object.fromEntries(timesheets.map((t: any) => [t.ID, t]))
        const userMap = Object.fromEntries(allUsers.map((u: any) => [u.ID, u]))
        const projectMap = Object.fromEntries(allProjects.map((p: any) => [p.ID, p]))
        const taskMap = Object.fromEntries(allTasks.map((t: any) => [t.ID, t]))

        const enriched = filteredEntries.map((e: any) => {
            const ts = tsMap[e.timesheet_ID]
            return {
                ...e,
                user: userMap[ts?.user_ID] || null,
                project: projectMap[e.project_ID] || null,
                task: e.task_ID ? taskMap[e.task_ID] : null,
            }
        })

        // ── Generate Excel (reuse existing ExcelService) ───────────────────────
        // Build a synthetic timesheet header for the export
        const synthTs = {
            month: month || new Date(fromDate).getMonth() + 1,
            year: year,
        }
        const excelUser = filterUserId ? userMap[filterUserId] : admin

        let buffer: Buffer
        try {
            buffer = await ExcelService.generateTimesheetExcel({
                timesheet: synthTs,
                user: excelUser,
                entries: enriched,
            })
        } catch (e: any) {
            return req.reject(500, `Excel generation failed: ${e.message}`)
        }

        // ── Save ExportLog ─────────────────────────────────────────────────────
        const exportLogEntry: any = {
            exportedBy_ID: admin.ID,
            exportDate: new Date().toISOString(),
            fromDate: fromDate,
            toDate: toDate,
            userId: filterUserId || null,
            projectId: filterProjectId || null,
            totalEntries: filteredEntries.length,
            filters: JSON.stringify({ month, year, userId: filterUserId, projectId: filterProjectId, from: fromStr, to: toStr }),
        }
        await INSERT.into(ExportLog).entries(exportLogEntry)

        // ── Return binary stream ───────────────────────────────────────────────
        const monthLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][(synthTs.month || 1) - 1]
        const fileName = `Timesheet_${excelUser?.lastName || 'All'}_${monthLabel}_${year}.xlsx`

        req.res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': buffer.length,
        })
        req.res.status(200).send(buffer)
    }

    // ── sendEmailToGermany ────────────────────────────────────────────────────
    private async onSendEmailToGermany(req: any) {
        const { exportId, recipientEmail } = req.data as { exportId?: string; recipientEmail?: string }

        const admin = await resolveUser(req)
        if (!admin) return req.reject(401, 'Admin user not found')

        // Check for SMTP configuration
        const smtpHost = process.env['SMTP_HOST']
        const smtpUser = process.env['SMTP_USER']
        const smtpPass = process.env['SMTP_PASS']
        const defaultRecipient = process.env['GERMANY_EMAIL']

        if (!smtpHost || !smtpUser || !smtpPass) {
            return (
                'Email not sent. Please configure the following environment variables to enable email: ' +
                'SMTP_HOST, SMTP_USER, SMTP_PASS (and optionally GERMANY_EMAIL for default recipient). ' +
                'Example: SMTP_HOST=smtp.gmail.com SMTP_USER=your@email.com SMTP_PASS=yourpassword GERMANY_EMAIL=germany@client.de'
            )
        }

        const recipient = recipientEmail || defaultRecipient
        if (!recipient) {
            return req.reject(400, 'recipientEmail is required (or set GERMANY_EMAIL environment variable)')
        }

        // Find the export log record to attach
        const db = cds.db || await cds.connect.to('db')
        const { ExportLog } = db.entities('sap.timesheet')

        let exportRecord: any
        if (exportId) {
            ;[exportRecord] = await SELECT.from(ExportLog).where({ ID: exportId })
            if (!exportRecord) return req.reject(404, `ExportLog record "${exportId}" not found`)
        } else {
            const [latest] = await SELECT.from(ExportLog).orderBy('exportDate desc').limit(1)
            exportRecord = latest
            if (!exportRecord) return req.reject(404, 'No export records found. Please run an export first.')
        }

        // nodemailer integration
        let nodemailer: any
        try {
            nodemailer = require('nodemailer')
        } catch {
            return req.reject(500, 'nodemailer package is not installed. Run: npm install nodemailer')
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(process.env['SMTP_PORT'] || 587),
            secure: process.env['SMTP_SECURE'] === 'true',
            auth: { user: smtpUser, pass: smtpPass },
        })

        const subject = `Timesheet Export – ${exportRecord.fromDate} to ${exportRecord.toDate}`
        const body = [
            `Dear Team,`,
            ``,
            `Please find attached the timesheet export for the period ${exportRecord.fromDate} to ${exportRecord.toDate}.`,
            ``,
            `Summary:`,
            `  - Total entries: ${exportRecord.totalEntries}`,
            `  - Exported by: ${admin.firstName} ${admin.lastName}`,
            `  - Export date: ${exportRecord.exportDate}`,
            ``,
            `Best regards,`,
            `${admin.firstName} ${admin.lastName}`,
        ].join('\n')

        await transporter.sendMail({
            from: smtpUser,
            to: recipient,
            cc: smtpUser,   // CC the sending admin
            subject,
            text: body,
        })

        return `Email sent successfully to ${recipient} (Export period: ${exportRecord.fromDate} – ${exportRecord.toDate})`
    }

    // ── adminModifyEntryHours ─────────────────────────────────────────────────
    private async onAdminModifyEntryHours(req: any) {
        const { entryId, approvedHours, note } = req.data as {
            entryId: string
            approvedHours: number
            note?: string
        }

        if (!entryId) return req.reject(400, 'entryId is required')
        if (approvedHours === undefined || approvedHours === null) return req.reject(400, 'approvedHours is required')
        if (approvedHours < 0 || approvedHours > 24) return req.reject(400, 'approvedHours must be between 0 and 24')

        const admin = await resolveUser(req)
        if (!admin) return req.reject(401, 'Admin user not found')

        const db = cds.db || await cds.connect.to('db')
        const { TimesheetEntry, AuditLog, ApprovalHistory, Timesheet } = db.entities('sap.timesheet')

        const [entry] = await SELECT.from(TimesheetEntry).where({ ID: entryId })
        if (!entry) return req.reject(404, 'TimesheetEntry not found')

        const originalHours = entry.approvedHours ?? entry.loggedHours

        await UPDATE(TimesheetEntry).set({
            approvedHours: approvedHours,
            hoursModifiedBy_ID: admin.ID,
            hoursModifiedAt: new Date().toISOString(),
        }).where({ ID: entryId })

        // Write audit log
        await INSERT.into(AuditLog).entries({
            entity_: 'TimesheetEntry',
            entityId: entryId,
            action: 'Updated',
            userId: admin.ID,
            changes: JSON.stringify({
                approvedHours: `${originalHours} → ${approvedHours}`,
                note: note || null,
                modifiedBy: `${admin.firstName} ${admin.lastName}`,
            }),
        })

        // **NEW**: Write ApprovalHistory to timesheet for frontend display
        const [timesheet] = await SELECT.from(Timesheet).where({ ID: entry.timesheet_ID })
        if (timesheet) {
            await INSERT.into(ApprovalHistory).entries({
                timesheet_ID: entry.timesheet_ID,
                actor_ID: admin.ID,
                action: 'Modified',
                fromStatus: timesheet.status,
                toStatus: timesheet.status,
                comment: `Changed hours on ${entry.date} from ${originalHours} to ${approvedHours}${note ? ` (${note})` : ''}`,
                timestamp: new Date().toISOString()
            })
        }

        return `Hours updated: ${originalHours} → ${approvedHours}${note ? ` (Note: ${note})` : ''}`
    }
}
