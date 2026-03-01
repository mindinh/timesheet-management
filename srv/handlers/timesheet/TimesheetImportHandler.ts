import cds from '@sap/cds'
import { resolveUser } from '../../lib/user-resolver'

/**
 * TimesheetImportHandler
 *
 * Handles importing timesheet entries from an Excel file.
 *
 * Expected Excel columns (matching the aTrung template):
 *   B = Date        (e.g. "2026-02-13" or "13 Feb 2026")
 *   C = Type        (Papierkram / Internal / External / Others)
 *   D = Description (task description / notes)
 *   E = Location    (Working Location – optional)
 *   F = Hours       (decimal, e.g. 8.00)
 *   G = Project     (project name or Papierkram code – matched against DB)
 *   H = Note        (internal note – optional)
 *
 * The handler requires the `xlsx` (SheetJS) package.
 * Install with: npm install xlsx  (in the root package.json)
 */
export class TimesheetImportHandler {
    private srv: any

    constructor(srv: any) {
        this.srv = srv
    }

    register() {
        this.srv.on('importFromExcel', this.onImportFromExcel.bind(this))
    }

    private async onImportFromExcel(req: any) {
        const { timesheetId, fileContent } = req.data

        if (!timesheetId) return req.reject(400, 'timesheetId is required')
        if (!fileContent) return req.reject(400, 'fileContent is required')

        const user = await resolveUser(req)
        if (!user) return req.reject(401, 'User not found')

        const db = cds.db || await cds.connect.to('db')
        const { Timesheet, TimesheetEntry, Project } = db.entities('sap.timesheet')

        // Validate timesheet ownership and status
        const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId })
        if (!ts) return req.reject(404, 'Timesheet not found')
        if (ts.user_ID !== user.ID && user.role !== 'Admin' && user.role !== 'Manager') {
            return req.reject(403, 'You do not have access to import entries into this timesheet')
        }
        if (ts.status !== 'Draft' && ts.status !== 'Rejected') {
            return req.reject(400, `Cannot import – timesheet is "${ts.status}". Only Draft or Rejected timesheets can be edited.`)
        }

        // Parse Excel
        let XLSX: any
        try {
            XLSX = require('xlsx')
        } catch {
            return req.reject(500, 'xlsx (SheetJS) package is not installed. Run: npm install xlsx')
        }

        let rows: any[]
        try {
            // fileContent arrives as a Buffer or base64 string
            const buf = Buffer.isBuffer(fileContent)
                ? fileContent
                : Buffer.from(fileContent, 'base64')

            const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const raw: any[] = XLSX.utils.sheet_to_json(ws, { header: 'A', raw: false, defval: '' })
            // Skip the header row (row 1) and any rows until the data starts at row 14 (template format)
            // Filter rows that have at minimum a date-like value in col B and a non-zero F
            rows = raw.filter((r: any) => {
                const dateVal = (r['B'] || '').toString().trim()
                const hoursVal = parseFloat((r['F'] || '0').toString())
                return dateVal.length > 0 && !isNaN(hoursVal) && hoursVal > 0
            })
        } catch (e: any) {
            return req.reject(400, `Failed to parse Excel file: ${e.message}`)
        }

        if (!rows.length) {
            return req.reject(400, 'No valid data rows found in the Excel file. Ensure columns B=Date, F=Hours are filled.')
        }

        // Load all projects for name matching
        const allProjects = await SELECT.from(Project).where({ isActive: true })

        const entries: any[] = []
        const rowErrors: string[] = []

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i]
            const rowNum = i + 1

            // Parse date
            let dateStr: string
            const rawDate = (r['B'] || '').toString().trim()
            try {
                const parsed = new Date(rawDate)
                if (isNaN(parsed.getTime())) throw new Error('invalid date')
                dateStr = parsed.toISOString().split('T')[0]
            } catch {
                rowErrors.push(`Row ${rowNum}: invalid date "${rawDate}"`)
                continue
            }

            // Parse hours
            const loggedHours = parseFloat((r['F'] || '0').toString())
            if (isNaN(loggedHours) || loggedHours <= 0) {
                rowErrors.push(`Row ${rowNum}: invalid hours "${r['F']}"`)
                continue
            }
            if (loggedHours > 24) {
                rowErrors.push(`Row ${rowNum}: hours ${loggedHours} exceeds 24h limit`)
                continue
            }

            // Match project by name or code (col G for Papierkram, col H for others)
            const projectRef = (r['G'] || r['H'] || '').toString().trim()
            let projectId: string | null = null
            if (projectRef) {
                const matched = allProjects.find((p: any) =>
                    p.name?.toLowerCase() === projectRef.toLowerCase() ||
                    p.code?.toLowerCase() === projectRef.toLowerCase()
                )
                if (matched) {
                    projectId = matched.ID
                } else {
                    rowErrors.push(`Row ${rowNum}: project "${projectRef}" not found – entry will be skipped`)
                    continue
                }
            }

            if (!projectId) {
                rowErrors.push(`Row ${rowNum}: project reference is required (col G or H)`)
                continue
            }

            entries.push({
                timesheet_ID: timesheetId,
                project_ID: projectId,
                date: dateStr,
                loggedHours: loggedHours,
                description: (r['D'] || '').toString().trim() || null,
            })
        }

        if (!entries.length) {
            return req.reject(400, `No rows could be imported. Errors: ${rowErrors.join(' | ')}`)
        }

        // Bulk insert
        await INSERT.into(TimesheetEntry).entries(entries)

        const msg = `Imported ${entries.length} entries successfully.`
        return rowErrors.length
            ? `${msg} Skipped rows: ${rowErrors.join(' | ')}`
            : msg
    }
}
