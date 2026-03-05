import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { TimesheetBatchDetail } from '@/features/admin/api/admin-api'
import { format } from 'date-fns'

const MONTH_NAMES = [
    '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

// ─── Color palette extracted from template ───────────────────────────────────
const COLOR = {
    NAVY: 'FF17365D', // Dark navy blue  – section headers (Title/Legend/History)
    LIGHT_BLUE: 'FF8DB3E2', // Soft blue       – Papierkram type badge, Version row
    LIGHT_PINK: 'FFE5B8B7', // Salmon/pink     – Internal type badge
    DARK_RED: 'FFC00000', // Dark red        – Title sheet accent cells
    GRAY_HEADER: 'FFC0C0C0', // Silver gray     – Data table column headers (Jan sheet)
    WHITE: 'FFFFFFFF',
} as const

// ─── Helpers ─────────────────────────────────────────────────────────────────
function solidFill(argb: string): ExcelJS.Fill {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function thinBorder(sides: ('top' | 'left' | 'bottom' | 'right')[] = ['top', 'left', 'bottom', 'right']): Partial<ExcelJS.Borders> {
    const border: Partial<ExcelJS.Borders> = {}
    for (const s of sides) border[s] = { style: 'thin' }
    return border
}

function styleHeaderCell(cell: ExcelJS.Cell, text: string) {
    cell.value = text
    cell.font = { bold: true, color: { argb: COLOR.WHITE }, name: 'Calibri', size: 11 }
    cell.fill = solidFill(COLOR.NAVY)
    cell.border = thinBorder()
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
}

// ─── Main export function ─────────────────────────────────────────────────────
export const exportBatchToExcel = async (batch: TimesheetBatchDetail) => {
    const wb = new ExcelJS.Workbook()

    // ── 1. TITLE SHEET ────────────────────────────────────────────────────────
    const titleSheet = wb.addWorksheet('Title')

    // Column widths matching template layout
    titleSheet.columns = Array.from({ length: 30 }, (_, i) => ({ width: i === 7 ? 25 : i === 10 ? 20 : i === 14 ? 20 : i === 17 ? 40 : 6 }))

        // Dark red accent cells (top-left decoration in template)
        ; (['B2', 'C2', 'E2', 'B3', 'C3', 'D5', 'D6'] as const).forEach(addr => {
            titleSheet.getCell(addr).fill = solidFill(COLOR.DARK_RED)
        })

    // Title banner – navy background
    const titleCell = titleSheet.getCell('H4')
    titleCell.value = 'Timesheet conarum VN'
    titleCell.font = { bold: true, size: 14, color: { argb: COLOR.WHITE }, name: 'Calibri' }
    titleCell.fill = solidFill(COLOR.NAVY)

    // Version row – light blue
    const versionLabelCell = titleSheet.getCell('AA6')
    versionLabelCell.value = 'Version'
    versionLabelCell.font = { bold: true, name: 'Calibri' }
    versionLabelCell.fill = solidFill(COLOR.LIGHT_BLUE)

    const versionValueCell = titleSheet.getCell('AD6')
    versionValueCell.value = 1.2
    versionValueCell.fill = solidFill(COLOR.LIGHT_BLUE)

    // Change History header row – navy
    for (const [addr, label] of [['H13', 'Change History'], ['L13', 'Action'], ['O13', 'Name'], ['R13', 'Content']] as const) {
        styleHeaderCell(titleSheet.getCell(addr), label)
    }

    // History data rows
    titleSheet.addRow([])
    titleSheet.addRow([])
    titleSheet.addRow([])
    titleSheet.addRow([])
    titleSheet.addRow([])
    titleSheet.addRow([])
    titleSheet.addRow([])
    titleSheet.addRow([])
    titleSheet.addRow([])
    titleSheet.addRow([])
    titleSheet.addRow([])
    titleSheet.addRow([])
    titleSheet.addRow([])

    // Manually set history rows at correct row numbers
    const h14 = titleSheet.getRow(14)
    h14.getCell(8).value = 45873   // H14
    h14.getCell(12).value = 'New'
    h14.getCell(15).value = 'HieuT2'
    h14.getCell(18).value = 'Create new'

    const h15 = titleSheet.getRow(15)
    h15.getCell(8).value = 45694
    h15.getCell(12).value = 'Update'
    h15.getCell(15).value = 'HieuT2'
    h15.getCell(18).value = 'Adjust Papierkram code'

    // Type legend section
    const typeHeader = titleSheet.getRow(17)
    const typeHeaderH = typeHeader.getCell(8)
    typeHeaderH.value = 'Type'
    typeHeaderH.font = { bold: true, color: { argb: COLOR.WHITE }, name: 'Calibri' }
    typeHeaderH.fill = solidFill(COLOR.NAVY)
    const typeHeaderK = typeHeader.getCell(11)
    typeHeaderK.value = 'Note'
    typeHeaderK.font = { bold: true, color: { argb: COLOR.WHITE }, name: 'Calibri' }
    typeHeaderK.fill = solidFill(COLOR.NAVY)

    // Papierkram – light blue badge
    const r18 = titleSheet.getRow(18)
    const r18h = r18.getCell(8)
    r18h.value = 'Papierkram'
    r18h.font = { bold: true, name: 'Calibri' }
    r18h.fill = solidFill(COLOR.LIGHT_BLUE)
    r18.getCell(11).value = 'For Projects logged in Papierkram'

    // Internal – light pink badge
    const r19 = titleSheet.getRow(19)
    const r19h = r19.getCell(8)
    r19h.value = 'Internal'
    r19h.font = { bold: true, name: 'Calibri' }
    r19h.fill = solidFill(COLOR.LIGHT_PINK)
    r19.getCell(11).value = 'conarum VN customer project, but not logged in Papierkram\n*** Write project name in Note coloumns'

    // Others – no background
    const r20 = titleSheet.getRow(20)
    const r20h = r20.getCell(8)
    r20h.value = 'Others'
    r20h.font = { bold: true, name: 'Calibri' }
    r20.getCell(11).value = 'Internal Project, Training, sharing, self study, marketing, management, interview, meeting, timesheet ...'


    // ── 2. LEGEND SHEET ───────────────────────────────────────────────────────
    const legendSheet = wb.addWorksheet('Legend')
    legendSheet.columns = [
        { width: 5 },
        { width: 25 }, // B: Customer
        { width: 45 }, // C: Papierkram/Project Code
        { width: 60 }, // D: Project Name
        { width: 10 }, // E: Active
        { width: 22 }, // F: Project Manager
        { width: 25 }, // G: Note
    ]

    // Header row – navy background, white bold text
    const legendHeaderLabels = ['Customer', 'Papierkram/Project Code', 'Project Name', 'Active', 'Project Manager', 'Note']
    const legendHeaderRow = legendSheet.getRow(2)
    legendHeaderLabels.forEach((label, i) => {
        const cell = legendHeaderRow.getCell(i + 2) // starts at col B
        styleHeaderCell(cell, label)
    })
    legendHeaderRow.height = 20

    // Sample data rows
    const legendData = [
        ['Spirit/21', 'Schunk div. Papierkram Projects', 'Active', 'Stefan Bäumler', ''],
        ['KARON', '2025_0001_KARON_EV_KNORR_BREMSE', 'Active', 'Thomas Deubel', ''],
        ['biotest', '4530039906_10_biotest_2025: Support MM/SRM', 'Active', 'Thomas Deubel', ''],
        ['manrolandgoss', '4501144702 - SAP-Support', 'Active', 'Stefan Bäumler', ''],
        ['Siltronic', '4501917977 - Support 2025', 'Active', 'Wolfgang Straßer', ''],
    ]

    legendData.forEach((rowData, idx) => {
        const row = legendSheet.getRow(idx + 3)
        const [customer, code, active, pm, note] = rowData
        row.getCell(2).value = customer
        row.getCell(3).value = code
        row.getCell(4).value = { formula: `=B${idx + 3}&"-"&C${idx + 3}` }  // Project Name formula
        row.getCell(5).value = active
        row.getCell(6).value = pm
        row.getCell(7).value = note

        // Alternating light row tint for readability
        if (idx % 2 === 0) {
            for (let c = 2; c <= 7; c++) {
                row.getCell(c).fill = solidFill('FFF2F2F2')
            }
        }
    })


    // ── 3. DATA SHEETS (one per timesheet/user) ───────────────────────────────
    batch.timesheets.forEach(ts => {
        const monthName = MONTH_NAMES[ts.month] || `Month_${ts.month}`
        const safeSheetName = `${monthName}_${ts.user.firstName}`.substring(0, 31)
        const tsSheet = wb.addWorksheet(safeSheetName)

        tsSheet.columns = [
            { width: 2 },  // A: spacer
            { width: 14 }, // B: Date
            { width: 13 }, // C: Type
            { width: 52 }, // D: Task
            { width: 8 },  // E: onsite
            { width: 8 },  // F: Hours
            { width: 48 }, // G: Project
            { width: 40 }, // H: Note
            { width: 2 },  // I: spacer
            { width: 42 }, // J: Project Sum Label
            { width: 13 }, // K: Sum Value
        ]

        // ── Project summary (top-right, columns J & K) ──
        const entries = ts.entries || []
        const projectSums: Record<string, number> = {}
        let grandTotal = 0
        entries.forEach(e => {
            const pName = e.project?.name || '(blank)'
            projectSums[pName] = (projectSums[pName] || 0) + (e.approvedHours ?? e.loggedHours ?? 0)
            grandTotal += (e.approvedHours ?? e.loggedHours ?? 0)
        })

        // J1/K1 – column headers for summary block
        const j1 = tsSheet.getCell('J1')
        j1.value = 'Project(Papierkram)'
        j1.font = { bold: true, name: 'Calibri', size: 11 }

        const k1 = tsSheet.getCell('K1')
        k1.value = 'Sum of Hours'
        k1.font = { bold: true, name: 'Calibri', size: 11 }

        let summaryRow = 2
        Object.entries(projectSums).forEach(([pName, sum]) => {
            tsSheet.getCell(`J${summaryRow}`).value = pName
            tsSheet.getCell(`K${summaryRow}`).value = sum
            summaryRow++
        })

        const grandTotalJCell = tsSheet.getCell(`J${summaryRow}`)
        const grandTotalKCell = tsSheet.getCell(`K${summaryRow}`)
        grandTotalJCell.value = 'Grand Total'
        grandTotalJCell.font = { bold: true, name: 'Calibri' }
        grandTotalKCell.value = grandTotal
        grandTotalKCell.font = { bold: true, name: 'Calibri' }

        // ── Header info block (rows 1–12, columns B–H) ──
        const infoRows: [string, string, string | number | undefined][] = [
            ['B1', 'Service Entry Sheet', undefined],
            ['B2', 'Project:', undefined],
            ['D2', 'Conarum VN - SAP Development Services', undefined],
            ['B5', 'Customer', undefined],
            ['D5', 'conarum GmbH & Co. KG', undefined],
            ['B6', 'Place:', undefined],
            ['D6', 'Germany', undefined],
            ['B8', 'Company', undefined],
            ['D8', 'conarum Vietnam Company Ltd.', undefined],
            ['B9', 'Employee', undefined],
            ['D9', `${ts.user.firstName} ${ts.user.lastName}`, undefined],
            ['B10', 'Period: ', undefined],
            ['D10', `${monthName} 01, ${ts.year}`, undefined],
            ['B11', 'Customer contact person:', undefined],
            ['B4', 'Please indicate on each invoice', undefined],
            ['E12', '* Write "X" if Onsite', undefined],
        ]
        infoRows.forEach(([addr, value]) => {
            tsSheet.getCell(addr).value = value
        })

            // Bold labels
            ; (['B1', 'B2', 'D2', 'B5', 'B6', 'B8', 'B9', 'B10', 'B11'] as const).forEach(addr => {
                const c = tsSheet.getCell(addr)
                c.font = { bold: true, name: 'Calibri', size: 11 }
            })
        tsSheet.getCell('B1').font = { bold: true, size: 14, name: 'Calibri' }
        tsSheet.getCell('E12').font = { italic: true, size: 9, name: 'Calibri' }
        tsSheet.getCell('B4').font = { italic: true, name: 'Calibri' }

        // ── Data table header row (row 13) – gray background ──
        const DATA_HEADER_ROW = 13
        const columnLabels = ['', 'Date', 'Type', 'Task', 'onsite', 'Hours', 'Project(Papierkram)', 'Note (Internal Projects name)']
        const thRow = tsSheet.getRow(DATA_HEADER_ROW)
        thRow.height = 18

        columnLabels.forEach((label, i) => {
            if (i === 0) return // spacer col A
            const cell = thRow.getCell(i + 1)
            cell.value = label
            cell.font = { bold: true, name: 'Calibri', size: 11 }
            cell.fill = solidFill(COLOR.GRAY_HEADER)
            cell.border = thinBorder()
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
        })

        // ── Data rows ──
        const sortedEntries = [...entries].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        )

        sortedEntries.forEach((e, idx) => {
            const pName = e.project?.name || ''
            const taskName = e.task?.name || ''
            const desc = e.description || ''

            // Determine type → drives row background color
            let type = 'Papierkram'
            if (pName.toLowerCase().includes('internal')) type = 'Internal'
            else if (!pName && desc.toLowerCase().includes('training')) type = 'Others'
            else if (!pName) type = 'Others'

            const rowBg: string | null =
                type === 'Papierkram' ? COLOR.LIGHT_BLUE :
                    type === 'Internal' ? COLOR.LIGHT_PINK :
                        null  // Others – no tint

            const dataRow = tsSheet.getRow(DATA_HEADER_ROW + 1 + idx)
            dataRow.height = 16

            const cells: [number, string | number | Date | null][] = [
                [2, new Date(e.date)],                            // B: Date
                [3, type],                                        // C: Type
                [4, taskName],                                    // D: Task
                [5, ''],                                          // E: onsite
                [6, e.approvedHours ?? e.loggedHours ?? 0],      // F: Hours
                [7, pName],                                       // G: Project
                [8, desc],                                        // H: Note
            ]

            cells.forEach(([colIdx, value]) => {
                const cell = dataRow.getCell(colIdx)
                cell.value = value
                cell.border = thinBorder()
                if (rowBg) cell.fill = solidFill(rowBg)
                cell.font = { name: 'Calibri', size: 10 }
            })

            // Date formatting
            const dateCell = dataRow.getCell(2)
            dateCell.numFmt = 'MM/DD/YYYY'
            dateCell.alignment = { horizontal: 'left' }

            // Type cell – bold to match template
            const typeCell = dataRow.getCell(3)
            typeCell.font = { bold: true, name: 'Calibri', size: 10 }

            // Hours – right-aligned
            dataRow.getCell(6).alignment = { horizontal: 'right' }
        })
    })

    // ── 4. Save ───────────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer() as ArrayBuffer
    const createdDate = new Date(batch.createdAt)
    const yyyy_mm = format(createdDate, 'yyyy_MM')
    const filename = `${yyyy_mm} Conarum Timesheet BTP - ${batch.teamLead.firstName} ${batch.teamLead.lastName}.xlsx`

    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    saveAs(blob, filename)
}

// ─── Export single timesheet mimicking batch format ─────────────────────────
export const exportSingleTimesheetToExcel = async (ts: any) => {
    const wb = new ExcelJS.Workbook()

    // ── 1. TITLE SHEET ────────────────────────────────────────────────────────
    const titleSheet = wb.addWorksheet('Title')
    titleSheet.columns = Array.from({ length: 30 }, (_, i) => ({ width: i === 7 ? 25 : i === 10 ? 20 : i === 14 ? 20 : i === 17 ? 40 : 6 }))

        ; (['B2', 'C2', 'E2', 'B3', 'C3', 'D5', 'D6'] as const).forEach(addr => {
            titleSheet.getCell(addr).fill = solidFill(COLOR.DARK_RED)
        })

    const titleCell = titleSheet.getCell('H4')
    titleCell.value = 'Timesheet conarum VN'
    titleCell.font = { bold: true, size: 14, color: { argb: COLOR.WHITE }, name: 'Calibri' }
    titleCell.fill = solidFill(COLOR.NAVY)

    const versionLabelCell = titleSheet.getCell('AA6')
    versionLabelCell.value = 'Version'
    versionLabelCell.font = { bold: true, name: 'Calibri' }
    versionLabelCell.fill = solidFill(COLOR.LIGHT_BLUE)

    const versionValueCell = titleSheet.getCell('AD6')
    versionValueCell.value = 1.2
    versionValueCell.fill = solidFill(COLOR.LIGHT_BLUE)

    for (const [addr, label] of [['H13', 'Change History'], ['L13', 'Action'], ['O13', 'Name'], ['R13', 'Content']] as const) {
        styleHeaderCell(titleSheet.getCell(addr), label)
    }

    [...Array(13)].forEach(() => titleSheet.addRow([]))

    const h14 = titleSheet.getRow(14)
    h14.getCell(8).value = 45873
    h14.getCell(12).value = 'New'
    h14.getCell(15).value = 'HieuT2'
    h14.getCell(18).value = 'Create new'

    const h15 = titleSheet.getRow(15)
    h15.getCell(8).value = 45694
    h15.getCell(12).value = 'Update'
    h15.getCell(15).value = 'HieuT2'
    h15.getCell(18).value = 'Adjust Papierkram code'

    const typeHeader = titleSheet.getRow(17)
    const typeHeaderH = typeHeader.getCell(8)
    typeHeaderH.value = 'Type'
    typeHeaderH.font = { bold: true, color: { argb: COLOR.WHITE }, name: 'Calibri' }
    typeHeaderH.fill = solidFill(COLOR.NAVY)
    const typeHeaderK = typeHeader.getCell(11)
    typeHeaderK.value = 'Note'
    typeHeaderK.font = { bold: true, color: { argb: COLOR.WHITE }, name: 'Calibri' }
    typeHeaderK.fill = solidFill(COLOR.NAVY)

    const r18 = titleSheet.getRow(18)
    const r18h = r18.getCell(8)
    r18h.value = 'Papierkram'
    r18h.font = { bold: true, name: 'Calibri' }
    r18h.fill = solidFill(COLOR.LIGHT_BLUE)
    r18.getCell(11).value = 'For Projects logged in Papierkram'

    const r19 = titleSheet.getRow(19)
    const r19h = r19.getCell(8)
    r19h.value = 'Internal'
    r19h.font = { bold: true, name: 'Calibri' }
    r19h.fill = solidFill(COLOR.LIGHT_PINK)
    r19.getCell(11).value = 'conarum VN customer project, but not logged in Papierkram\n*** Write project name in Note coloumns'

    const r20 = titleSheet.getRow(20)
    const r20h = r20.getCell(8)
    r20h.value = 'Others'
    r20h.font = { bold: true, name: 'Calibri' }
    r20.getCell(11).value = 'Internal Project, Training, sharing, self study, marketing, management, interview, meeting, timesheet ...'

    // ── 2. LEGEND SHEET ───────────────────────────────────────────────────────
    const legendSheet = wb.addWorksheet('Legend')
    legendSheet.columns = [
        { width: 5 }, { width: 25 }, { width: 45 }, { width: 60 }, { width: 10 }, { width: 22 }, { width: 25 },
    ]

    const legendHeaderLabels = ['Customer', 'Papierkram/Project Code', 'Project Name', 'Active', 'Project Manager', 'Note']
    const legendHeaderRow = legendSheet.getRow(2)
    legendHeaderLabels.forEach((label, i) => styleHeaderCell(legendHeaderRow.getCell(i + 2), label))
    legendHeaderRow.height = 20

    const legendData = [
        ['Spirit/21', 'Schunk div. Papierkram Projects', 'Active', 'Stefan Bäumler', ''],
        ['KARON', '2025_0001_KARON_EV_KNORR_BREMSE', 'Active', 'Thomas Deubel', ''],
        ['biotest', '4530039906_10_biotest_2025: Support MM/SRM', 'Active', 'Thomas Deubel', ''],
        ['manrolandgoss', '4501144702 - SAP-Support', 'Active', 'Stefan Bäumler', ''],
        ['Siltronic', '4501917977 - Support 2025', 'Active', 'Wolfgang Straßer', ''],
    ]

    legendData.forEach((rowData, idx) => {
        const row = legendSheet.getRow(idx + 3)
        const [customer, code, active, pm, note] = rowData
        row.getCell(2).value = customer
        row.getCell(3).value = code
        row.getCell(4).value = { formula: `=B${idx + 3}&"-"&C${idx + 3}` }
        row.getCell(5).value = active
        row.getCell(6).value = pm
        row.getCell(7).value = note
        if (idx % 2 === 0) {
            for (let c = 2; c <= 7; c++) row.getCell(c).fill = solidFill('FFF2F2F2')
        }
    })

    // ── 3. DATA SHEET ─────────────────────────────────────────────────────────
    const monthName = MONTH_NAMES[ts.month] || `Month_${ts.month}`
    const safeSheetName = `${monthName}_${ts.user.firstName}`.substring(0, 31)
    const tsSheet = wb.addWorksheet(safeSheetName)

    tsSheet.columns = [
        { width: 2 }, { width: 14 }, { width: 13 }, { width: 52 }, { width: 8 }, { width: 8 }, { width: 48 }, { width: 40 }, { width: 2 }, { width: 42 }, { width: 13 },
    ]

    const entries = ts.entries || []
    const projectSums: Record<string, number> = {}
    let grandTotal = 0
    entries.forEach((e: any) => {
        const pName = e.project?.name || '(blank)'
        projectSums[pName] = (projectSums[pName] || 0) + (e.approvedHours ?? e.loggedHours ?? 0)
        grandTotal += (e.approvedHours ?? e.loggedHours ?? 0)
    })

    const j1 = tsSheet.getCell('J1')
    j1.value = 'Project(Papierkram)'
    j1.font = { bold: true, name: 'Calibri', size: 11 }

    const k1 = tsSheet.getCell('K1')
    k1.value = 'Sum of Hours'
    k1.font = { bold: true, name: 'Calibri', size: 11 }

    let summaryRow = 2
    Object.entries(projectSums).forEach(([pName, sum]) => {
        tsSheet.getCell(`J${summaryRow}`).value = pName
        tsSheet.getCell(`K${summaryRow}`).value = sum
        summaryRow++
    })

    const grandTotalJCell = tsSheet.getCell(`J${summaryRow}`)
    const grandTotalKCell = tsSheet.getCell(`K${summaryRow}`)
    grandTotalJCell.value = 'Grand Total'
    grandTotalJCell.font = { bold: true, name: 'Calibri' }
    grandTotalKCell.value = grandTotal
    grandTotalKCell.font = { bold: true, name: 'Calibri' }

    const infoRows: [string, string, string | number | undefined][] = [
        ['B1', 'Service Entry Sheet', undefined],
        ['B2', 'Project:', undefined],
        ['D2', 'Conarum VN - SAP Development Services', undefined],
        ['B5', 'Customer', undefined],
        ['D5', 'conarum GmbH & Co. KG', undefined],
        ['B6', 'Place:', undefined],
        ['D6', 'Germany', undefined],
        ['B8', 'Company', undefined],
        ['D8', 'conarum Vietnam Company Ltd.', undefined],
        ['B9', 'Employee', undefined],
        ['D9', `${ts.user.firstName} ${ts.user.lastName}`, undefined],
        ['B10', 'Period: ', undefined],
        ['D10', `${monthName} 01, ${ts.year}`, undefined],
        ['B11', 'Customer contact person:', undefined],
        ['B4', 'Please indicate on each invoice', undefined],
        ['E12', '* Write "X" if Onsite', undefined],
    ]

    infoRows.forEach(([addr, value]) => {
        tsSheet.getCell(addr).value = value
    })

        ; (['B1', 'B2', 'D2', 'B5', 'B6', 'B8', 'B9', 'B10', 'B11'] as const).forEach(addr => {
            tsSheet.getCell(addr).font = { bold: true, name: 'Calibri', size: 11 }
        })
    tsSheet.getCell('B1').font = { bold: true, size: 14, name: 'Calibri' }
    tsSheet.getCell('E12').font = { italic: true, size: 9, name: 'Calibri' }
    tsSheet.getCell('B4').font = { italic: true, name: 'Calibri' }

    const DATA_HEADER_ROW = 13
    const columnLabels = ['', 'Date', 'Type', 'Task', 'onsite', 'Hours', 'Project(Papierkram)', 'Note (Internal Projects name)']
    const thRow = tsSheet.getRow(DATA_HEADER_ROW)
    thRow.height = 18

    columnLabels.forEach((label, i) => {
        if (i === 0) return
        const cell = thRow.getCell(i + 1)
        cell.value = label
        cell.font = { bold: true, name: 'Calibri', size: 11 }
        cell.fill = solidFill(COLOR.GRAY_HEADER)
        cell.border = thinBorder()
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    const sortedEntries = [...entries].sort((a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    let currentRowIdx = DATA_HEADER_ROW + 1
    sortedEntries.forEach((e: any) => {
        const pName = e.project?.name || ''
        const taskName = e.task?.name || ''
        const desc = e.description || ''

        let type = 'Papierkram'
        if (pName.toLowerCase().includes('internal')) type = 'Internal'
        else if (!pName && desc.toLowerCase().includes('training')) type = 'Others'
        else if (!pName) type = 'Others'

        const rowBg: string | null = type === 'Papierkram' ? COLOR.LIGHT_BLUE : type === 'Internal' ? COLOR.LIGHT_PINK : null

        const dataRow = tsSheet.getRow(currentRowIdx++)
        dataRow.height = 16

        const cells: [number, string | number | Date | null][] = [
            [2, new Date(e.date)],
            [3, type],
            [4, taskName],
            [5, ''],
            [6, e.approvedHours ?? e.loggedHours ?? 0],
            [7, pName],
            [8, desc],
        ]

        cells.forEach(([colIdx, value]) => {
            const cell = dataRow.getCell(colIdx)
            cell.value = value
            cell.border = thinBorder()
            if (rowBg) cell.fill = solidFill(rowBg)
            cell.font = { name: 'Calibri', size: 10 }
        })

        const dateCell = dataRow.getCell(2)
        dateCell.numFmt = 'MM/DD/YYYY'
        dateCell.alignment = { horizontal: 'left' }

        const typeCell = dataRow.getCell(3)
        typeCell.font = { bold: true, name: 'Calibri', size: 10 }
        dataRow.getCell(6).alignment = { horizontal: 'right' }
    })

    // ── 4. Save ───────────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer() as ArrayBuffer
    const yyyy_mm = `${ts.year}_${String(ts.month).padStart(2, '0')}`
    const filename = `${yyyy_mm} Conarum Timesheet BTP - ${ts.user.firstName} ${ts.user.lastName}.xlsx`

    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    saveAs(blob, filename)
}