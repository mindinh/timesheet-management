/**
 * ExcelService – generates a timesheet Excel file from a template.
 *
 * Template layout (based on the "Jan" sheet of timesheet_template.xlsx):
 *   B1:H1  "Service Entry Sheet"  (merged – left as-is)
 *   D2     Project name
 *   D5     Customer name
 *   D8     Company name
 *   D9     Employee name
 *   D10    Period start date (e.g. "January 01,2025")
 *   Row 13 Column headers: B=Date, C=Type, D=Task, E=onsite, F=Hours, G=Project(Papierkram), H=Note
 *   Row 14–59  Data rows (max 46 entries)
 *   Row 60     "Sum" label (B60:D60 merged), F60 = =SUM(F14:F59)
 *   Row 61     F61 = =F60/8 (Days), G61 = "Days"
 *   Row 64     Signature block
 *   Row 66     Signing instructions
 *   J1:K4  Per-project summary (dynamically computed)
 *
 * Preserves all template formatting, merged cells, and sheets (Title, Legend).
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';

const TEMPLATE_PATH = path.resolve(__dirname, '..', '..', '..', 'srv', 'templates', 'timesheet_template.xlsx');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

// Column layout in the "Jan" sheet
const DATA_COLS = ['B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

const COL = {
  DATE: 'B',
  TYPE: 'C',
  TASK: 'D',
  ONSITE: 'E',
  HOURS: 'F',
  PROJECT_PAPIERKRAM: 'G',
  NOTE: 'H',
} as const;

// Fixed data area in the template (rows 14–59)
const DATA_START_ROW = 14;
const DATA_END_ROW = 59;
const SUM_ROW = 60;
const DAYS_ROW = 61;

// Fill color for Internal / Others rows (light blue matching reference screenshot)
const HIGHLIGHT_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFBDD7EE' },
};

// Explicit "no fill" to override baked-in template fills
const NO_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'none',
};

// ── Types ────────────────────────────────────────────────────────────────────

interface TimesheetHeader {
  month?: number;
  year: number;
}

interface UserInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface EntryProject {
  name?: string;
  code?: string;
  type?: string;
}

interface EntryTask {
  name?: string;
}

interface TimesheetEntryData {
  date?: string;
  description?: string;
  approvedHours?: number;
  loggedHours?: number;
  project_ID?: string;
  task_ID?: string;
  project?: EntryProject | null;
  task?: EntryTask | null;
}

export interface GenerateExcelParams {
  timesheet: TimesheetHeader;
  user: UserInfo;
  entries: TimesheetEntryData[];
  templatePath?: string;
}

// ── Main Export Function ─────────────────────────────────────────────────────

export async function generateTimesheetExcel({
  timesheet,
  user,
  entries,
  templatePath,
}: GenerateExcelParams): Promise<Buffer> {
  const tplPath = templatePath || TEMPLATE_PATH;

  // 1. Load template workbook
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(tplPath);

  // 2. Get the "Jan" sheet (or first data sheet) and rename to the target month
  const monthName = MONTH_NAMES[(timesheet.month || 1) - 1] || 'Jan';
  let ws = wb.getWorksheet('Jan');
  if (!ws) {
    ws = wb.worksheets.find((s) => s.name !== 'Title' && s.name !== 'Legend') || wb.worksheets[0];
  }
  if (!ws) {
    throw new Error('No valid worksheet found in template');
  }
  ws.name = monthName;

  // 3. Fill header fields
  const fullName = formatFullName(user.firstName, user.lastName);
  const monthIndex = (timesheet.month || 1) - 1;
  const periodDate = formatPeriodDate(timesheet.year, monthIndex);

  setCellValue(ws, 'D9', fullName);
  setCellValue(ws, 'D10', periodDate);

  // 4. Sort entries by date
  const sorted = [...entries].sort((a, b) => {
    const da = new Date(a.date || '');
    const db = new Date(b.date || '');
    return da.getTime() - db.getTime();
  });

  // 5. Clear existing data rows (14–59) — clear values AND reset fills
  //    (Template may have baked-in fills from the original user's data)
  for (let r = DATA_START_ROW; r <= DATA_END_ROW; r++) {
    const row = ws.getRow(r);
    for (const col of DATA_COLS) {
      const cell = row.getCell(col);
      cell.value = null;
      cell.style = { ...cell.style, fill: NO_FILL };
    }
  }

  // 6. Write sorted entries (capped at the data area)
  const maxEntries = Math.min(sorted.length, DATA_END_ROW - DATA_START_ROW + 1);
  let totalHours = 0;

  for (let i = 0; i < maxEntries; i++) {
    const entry = sorted[i];
    const row = ws.getRow(DATA_START_ROW + i);
    const projectType = entry.project?.type || '';
    const isHighlighted = projectType === 'Internal' || projectType === 'Others';

    // B – Date
    row.getCell(COL.DATE).value = entry.date ? new Date(entry.date) : null;

    // C – Type (project type)
    row.getCell(COL.TYPE).value = projectType;

    // D – Task: format as "TaskName - Description" or just one of them
    const taskName = entry.task?.name || '';
    const descr = entry.description || '';
    if (taskName && descr) {
      row.getCell(COL.TASK).value = `${taskName} - ${descr}`;
    } else {
      row.getCell(COL.TASK).value = taskName || descr;
    }

    // E – onsite marker (not tracked in schema – leave blank)
    row.getCell(COL.ONSITE).value = null;

    // F – Hours
    const hours = Number(entry.approvedHours ?? entry.loggedHours ?? 0);
    row.getCell(COL.HOURS).value = hours;
    totalHours += hours;

    // G – Project code (for Papierkram type)
    if (projectType === 'Papierkram') {
      row.getCell(COL.PROJECT_PAPIERKRAM).value = entry.project?.code || entry.project?.name || '';
    } else {
      row.getCell(COL.PROJECT_PAPIERKRAM).value = '';
    }

    // H – Note (project name for Internal/Others)
    if (projectType !== 'Papierkram') {
      row.getCell(COL.NOTE).value = entry.project?.code || entry.project?.name || '';
    } else {
      row.getCell(COL.NOTE).value = '';
    }

    // Apply highlight fill ONLY for Internal / Others data rows
    if (isHighlighted) {
      for (const col of DATA_COLS) {
        row.getCell(col).fill = HIGHLIGHT_FILL;
      }
    }
  }

  // 7. Re-set SUM and Days formulas with correct cached results
  //    Use number result type to avoid Excel recovery errors
  const sumCell = ws.getRow(SUM_ROW).getCell(COL.HOURS);
  sumCell.value = { formula: `SUM(F${DATA_START_ROW}:F${DATA_END_ROW})`, result: Number(totalHours) };

  const daysCell = ws.getRow(DAYS_ROW).getCell(COL.HOURS);
  daysCell.value = { formula: `F${SUM_ROW}/8`, result: Number((totalHours / 8).toFixed(2)) };

  // 8. Build per-project summary in J/K columns (top-right area)
  buildProjectSummary(ws, sorted);

  // 9. Generate buffer
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function setCellValue(ws: ExcelJS.Worksheet, address: string, value: any): void {
  ws.getCell(address).value = value;
}

function formatFullName(firstName?: string, lastName?: string): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.join(' ');
}

function formatPeriodDate(year: number, monthIndex: number): string {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${monthNames[monthIndex]} 01,${year}`;
}

/**
 * Build a per-project summary in the J/K columns (rows 1–N).
 * Groups hours by individual project name (not project type).
 * Last row: J = "Grand Total", K = sum of all hours.
 */
function buildProjectSummary(ws: ExcelJS.Worksheet, entries: TimesheetEntryData[]): void {
  // Group hours by project name (each distinct project gets its own row)
  const projectHours: Record<string, number> = {};

  for (const entry of entries) {
    const hours = Number(entry.approvedHours ?? entry.loggedHours ?? 0);
    const projectName = entry.project?.name || entry.project?.code || '(Unknown)';
    if (!projectHours[projectName]) {
      projectHours[projectName] = 0;
    }
    projectHours[projectName] += hours;
  }

  // Clear existing J/K summary area (rows 1–10)
  for (let r = 1; r <= 10; r++) {
    ws.getRow(r).getCell('J').value = null;
    ws.getRow(r).getCell('K').value = null;
  }

  // Write summary header
  let summaryRow = 1;
  ws.getRow(summaryRow).getCell('J').value = 'Project(Papierkram)';
  ws.getRow(summaryRow).getCell('K').value = 'Sum of Hours';
  summaryRow++;

  // Write per-project rows
  let grandTotal = 0;
  const projectNames = Object.keys(projectHours);
  for (const name of projectNames) {
    const hours = projectHours[name];
    ws.getRow(summaryRow).getCell('J').value = name;
    ws.getRow(summaryRow).getCell('K').value = hours;
    grandTotal += hours;
    summaryRow++;
  }

  // Grand total row (skip one row for spacing)
  summaryRow++;
  ws.getRow(summaryRow).getCell('J').value = 'Grand Total';
  ws.getRow(summaryRow).getCell('K').value = grandTotal;

  // Total Days row  (grandTotal ÷ 8h per working day)
  summaryRow++;
  ws.getRow(summaryRow).getCell('J').value = 'Total Days (÷ 8h)';
  ws.getRow(summaryRow).getCell('K').value = parseFloat((grandTotal / 8).toFixed(2));
}
