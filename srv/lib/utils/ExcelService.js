/**
 * ExcelService – generates a timesheet Excel file from a template.
 *
 * Template layout (based on .agent/templates/timesheet_template.xlsx, "Jan" sheet):
 *   B1:H1  "Service Entry Sheet"  (merged – left as-is)
 *   D2     Project name
 *   D5     Customer name
 *   D8     Company name
 *   D9     Employee name  "Firstname, Lastname"
 *   D10    Period start date
 *   Row 13 Column headers: B=Date, C=Type, D=Task, E=onsite, F=Hours, G=Project(Papierkram), H=Note
 *   Row 14…N  Data rows
 *   Row N+1   Sum formula
 *   Row N+2   Days formula (sum / 8)
 *   Row N+5   Signatures
 */

const ExcelJS = require('exceljs')
const path = require('path')

const TEMPLATE_PATH = path.resolve(__dirname, '..', '..', '..', '.agent', 'templates', 'timesheet_template.xlsx')

// Month names used to label the worksheet tab
const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/**
 * Generate an Excel buffer for a given timesheet.
 *
 * @param {object}   params
 * @param {object}   params.timesheet       Timesheet header record
 * @param {object}   params.user            User record (firstName, lastName, email)
 * @param {object[]} params.entries         Array of TimesheetEntry records (with expanded project & task)
 * @param {string}   [params.templatePath]  Override path to template (for testing)
 * @returns {Promise<Buffer>}
 */
async function generateTimesheetExcel({ timesheet, user, entries, templatePath }) {
    const tplPath = templatePath || TEMPLATE_PATH

    // 1. Load template workbook
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(tplPath)

    // 2. Clone the "Jan" sheet or use it directly
    const monthName = MONTH_NAMES[(timesheet.month || 1) - 1] || 'Jan'
    let ws = wb.getWorksheet('Jan')
    if (!ws) {
        // Fallback – take first data sheet (skip "Title" and "legend")
        ws = wb.worksheets.find(s => s.name !== 'Title' && s.name !== 'legend') || wb.worksheets[0]
    }
    ws.name = monthName

    // 3. Fill header fields
    const fullName = `${user.firstName || ''}, ${user.lastName || ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, '')
    const periodDate = new Date(timesheet.year, (timesheet.month || 1) - 1, 1)

    setCellValue(ws, 'D9', fullName)
    setCellValue(ws, 'D10', periodDate)

    // 4. Sort entries by date
    const sorted = [...entries].sort((a, b) => {
        const da = new Date(a.date)
        const db = new Date(b.date)
        return da - db
    })

    // 5. Clear existing data rows (rows 14 … 45 in template) and write new ones
    const DATA_START_ROW = 14
    const TEMPLATE_LAST_DATA_ROW = 45

    // Clear old data
    for (let r = DATA_START_ROW; r <= TEMPLATE_LAST_DATA_ROW; r++) {
        const row = ws.getRow(r)
            ;['B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
                const cell = row.getCell(col)
                cell.value = null
            })
    }

    // Write sorted entries
    let currentRow = DATA_START_ROW
    for (const entry of sorted) {
        const row = ws.getRow(currentRow)

        // B – Date
        row.getCell('B').value = entry.date ? new Date(entry.date) : null

        // C – Type (project type)
        row.getCell('C').value = entry.project?.type || ''

        // D – Task description (task name or entry description)
        const taskName = entry.task?.name || ''
        const descr = entry.description || ''
        row.getCell('D').value = taskName ? (descr ? `${taskName}\n${descr}` : taskName) : descr

        // E – onsite marker (not tracked in schema – leave blank)
        row.getCell('E').value = null

        // F – Hours
        row.getCell('F').value = Number(entry.approvedHours ?? entry.loggedHours ?? 0)

        // G – Project name (for Papierkram type)
        if (entry.project?.type === 'Papierkram') {
            row.getCell('G').value = entry.project?.name || ''
        } else {
            row.getCell('G').value = ''
        }

        // H – Note (project name for Internal/Other, or project code)
        if (entry.project?.type !== 'Papierkram') {
            row.getCell('H').value = entry.project?.code || entry.project?.name || ''
        } else {
            row.getCell('H').value = ''
        }

        currentRow++
    }

    // 6. Write SUM formula after last data row
    // const sumRow = currentRow
    // const sumRowObj = ws.getRow(sumRow)
    // sumRowObj.getCell('B').value = 'Sum'
    // sumRowObj.getCell('F').value = { formula: `SUM(F${DATA_START_ROW}:F${currentRow - 1})` }

    // const daysRow = sumRow + 1
    // const daysRowObj = ws.getRow(daysRow)
    // daysRowObj.getCell('F').value = { formula: `F${sumRow}/8` }
    // daysRowObj.getCell('G').value = 'Days'

    // 7. Signature block
    // const sigRow = daysRow + 3
    // ws.getRow(sigRow).getCell('B').value = 'Signature of Conarum VietNam employee'
    // ws.mergeCells(`G${sigRow}:H${sigRow}`)
    // ws.getRow(sigRow).getCell('G').value = 'Signature of customer contact person'

    // const noteRow = sigRow + 2
    // ws.getRow(noteRow).getCell('B').value =
    //     'Sign the activity report at the end of the accounting period and have it confirmed by the responsible project coordinator.'

    // 8. Generate buffer
    const buffer = await wb.xlsx.writeBuffer()
    return buffer
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function setCellValue(ws, address, value) {
    const cell = ws.getCell(address)
    cell.value = value
}

module.exports = { generateTimesheetExcel }
