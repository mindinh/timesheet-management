import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { TimesheetBatchDetail } from '@/features/admin/api/admin-api';
import { format } from 'date-fns';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTH_FULL = [
  '',
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

// Template path (served from public folder)
const TEMPLATE_PATH = '/2026_01 Conarum Timesheet BTP - Cuong Nguyen.xlsx';

// ─── Number formats (from template) ─────────────────────────────────────────
const FMT_DATE = '[$-409]d-mmm;@';
const FMT_HOURS = '_-* #,##0.00_-;-* #,##0.00_-;_-*"-"??_-;_-@';

const COLOR_GRAY = 'FFC0C0C0';

// ─── Helpers ────────────────────────────────────────────────────────────────
function solidFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
}

// ─── Load template buffer ───────────────────────────────────────────────────
let _tplCache: ArrayBuffer | null = null;
async function loadTemplateBuffer(): Promise<ArrayBuffer> {
  if (_tplCache) return _tplCache;
  const resp = await fetch(TEMPLATE_PATH);
  if (!resp.ok) throw new Error(`Failed to load Excel template: ${resp.status}`);
  _tplCache = await resp.arrayBuffer();
  return _tplCache;
}

// ─── Project type ────────────────────────────────────────────────────────────
export interface ProjectInfo {
  name: string;
  code: string;
  type: string;
  isActive: boolean;
}

// ─── Fill a "Jan"-style data sheet with entries ─────────────────────────────
function fillDataSheet(
  ws: ExcelJS.Worksheet,
  params: {
    employeeName: string;
    month: number;
    year: number;
    entries: Array<{
      date: string;
      description?: string;
      approvedHours?: number | null;
      loggedHours?: number;
      project?: { name?: string; code?: string; type?: string } | null;
      task?: { name?: string } | null;
    }>;
  }
): number {
  const { employeeName, month, year, entries } = params;

  // ── Update header fields ──
  ws.getCell('D9').value = employeeName;
  ws.getCell('D10').value = `${MONTH_FULL[month]} 01,${year}`;

  // ── Clear old data rows (14..200) & old summary (J/K 1..20) ──
  for (let r = 14; r <= 200; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      cell.value = null;
      cell.style = {};
    }
  }
  for (let r = 1; r <= 20; r++) {
    for (const col of ['J', 'K']) {
      const cell = ws.getCell(`${col}${r}`);
      cell.value = null;
      cell.style = {};
    }
  }

  // ── Rebuild project summary in J/K ──
  const projectSums: Record<string, number> = {};
  let grandTotal = 0;
  for (const e of entries) {
    const h = Number(e.approvedHours ?? e.loggedHours ?? 0);
    const pn = e.project?.name || '(blank)';
    projectSums[pn] = (projectSums[pn] || 0) + h;
    grandTotal += h;
  }
  const sFont: Partial<ExcelJS.Font> = { size: 10, name: 'Calibri', color: { argb: 'FF000000' } };

  ws.getCell('J1').value = 'Project(Papierkram)';
  ws.getCell('J1').font = sFont;
  ws.getCell('J1').border = thinBorder();
  ws.getCell('K1').value = 'Sum of Hours';
  ws.getCell('K1').font = sFont;
  ws.getCell('K1').border = thinBorder();

  let sr = 2;
  for (const [pn, sum] of Object.entries(projectSums)) {
    ws.getCell(`J${sr}`).value = pn;
    ws.getCell(`J${sr}`).font = sFont;
    ws.getCell(`J${sr}`).border = thinBorder();
    ws.getCell(`K${sr}`).value = sum;
    ws.getCell(`K${sr}`).font = sFont;
    ws.getCell(`K${sr}`).border = thinBorder();
    sr++;
  }
  // Grand Total
  ws.getCell(`J${sr}`).value = 'Grand Total';
  ws.getCell(`J${sr}`).font = sFont;
  ws.getCell(`J${sr}`).border = thinBorder();
  ws.getCell(`K${sr}`).value = grandTotal;
  ws.getCell(`K${sr}`).font = sFont;
  ws.getCell(`K${sr}`).border = thinBorder();
  sr++;
  // Total Days in J/K summary
  ws.getCell(`J${sr}`).value = 'Total Days (÷ 8h)';
  ws.getCell(`J${sr}`).font = { ...sFont, bold: true };
  ws.getCell(`J${sr}`).border = thinBorder();
  ws.getCell(`K${sr}`).value = parseFloat((grandTotal / 8).toFixed(2));
  ws.getCell(`K${sr}`).font = { ...sFont, bold: true };
  ws.getCell(`K${sr}`).border = thinBorder();

  // ── Re-create header row 13 (gray) ──
  const hLabels = [
    '',
    'Date',
    'Type',
    'Task',
    'onsite',
    'Hours',
    'Project(Papierkram)',
    'Note (Internal Projects name)',
  ];
  const thRow = ws.getRow(13);
  hLabels.forEach((label, i) => {
    if (i === 0) return;
    const cell = thRow.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, name: 'Calibri', size: 10 };
    cell.fill = solidFill(COLOR_GRAY);
    cell.border = thinBorder();
    cell.alignment = { horizontal: 'center' };
  });

  // ── Sort entries and fill data rows ──
  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const DATA_START = 14;
  sorted.forEach((e, idx) => {
    const pName = e.project?.name || '';
    const pCode = e.project?.code || '';
    const taskName = e.task?.name || '';
    const desc = e.description || '';

    // Type detection
    let type = 'Papierkram';
    if (pName.toLowerCase().includes('internal')) type = 'Internal';
    else if (!pName && desc.toLowerCase().includes('training')) type = 'Others';
    else if (!pName) type = 'Others';

    const colG = type === 'Papierkram' ? pCode || pName : '';

    const row = ws.getRow(DATA_START + idx);
    row.height = 14.4;

    // B: Date
    const bC = row.getCell(2);
    bC.value = new Date(e.date);
    bC.numFmt = FMT_DATE;
    bC.font = { name: 'Calibri', size: 10 };
    bC.alignment = { horizontal: 'center', vertical: 'top' };
    bC.border = thinBorder();

    // C: Type
    const cC = row.getCell(3);
    cC.value = type;
    cC.font = { bold: true, name: 'Calibri', size: 10 };
    cC.alignment = { horizontal: 'center', vertical: 'top' };
    cC.border = thinBorder();

    // D: Task description
    const dC = row.getCell(4);
    dC.value = taskName ? (desc ? `${taskName} - ${desc}` : taskName) : desc;
    dC.font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
    dC.alignment = { wrapText: true };
    dC.border = thinBorder();

    // E: onsite (blank, just border)
    row.getCell(5).border = thinBorder();

    // F: Hours
    const fC = row.getCell(6);
    fC.value = Number(e.approvedHours ?? e.loggedHours ?? 0);
    fC.numFmt = FMT_HOURS;
    fC.font = { name: 'Calibri', size: 10 };
    fC.alignment = { horizontal: 'left', vertical: 'top' };
    fC.border = thinBorder();

    // G: Project code (Papierkram only)
    const gC = row.getCell(7);
    gC.value = colG;
    gC.font = { name: 'Calibri', size: 10 };
    gC.alignment = { horizontal: 'center', vertical: 'middle' };
    gC.border = thinBorder();

    // H: Note (empty, just border)
    row.getCell(8).border = thinBorder();
  });

  // ── Sum row ──
  const sumIdx = DATA_START + sorted.length;
  ws.mergeCells(`B${sumIdx}:D${sumIdx}`);

  const sumB = ws.getCell(`B${sumIdx}`);
  sumB.value = 'Sum';
  sumB.font = { bold: true, name: 'Calibri', size: 10 };
  sumB.fill = solidFill(COLOR_GRAY);
  sumB.alignment = { horizontal: 'center' };
  sumB.border = thinBorder();

  ws.getCell(`E${sumIdx}`).border = thinBorder();

  const sumF = ws.getCell(`F${sumIdx}`);
  sumF.value = { formula: `SUM(F${DATA_START}:F${sumIdx - 1})` };
  sumF.font = { bold: true, name: 'Calibri', size: 10 };
  sumF.fill = solidFill(COLOR_GRAY);
  sumF.numFmt = '0.00';
  sumF.border = thinBorder();

  // ── Days row (immediately below Sum) ──
  const daysIdx = sumIdx + 1;
  ws.mergeCells(`B${daysIdx}:D${daysIdx}`);
  const daysB = ws.getCell(`B${daysIdx}`);
  daysB.value = 'Days';
  daysB.font = { bold: true, name: 'Calibri', size: 10 };
  daysB.fill = solidFill(COLOR_GRAY);
  daysB.alignment = { horizontal: 'center' };
  daysB.border = thinBorder();
  ws.getCell(`E${daysIdx}`).border = thinBorder();
  const daysF = ws.getCell(`F${daysIdx}`);
  daysF.value = { formula: `F${sumIdx}/8`, result: parseFloat((grandTotal / 8).toFixed(2)) };
  daysF.font = { bold: true, name: 'Calibri', size: 10 };
  daysF.fill = solidFill(COLOR_GRAY);
  daysF.numFmt = '0.00';
  daysF.border = thinBorder();
  ws.getCell(`G${daysIdx}`).value = 'Days';
  ws.getCell(`G${daysIdx}`).font = { name: 'Calibri', size: 10 };
  ws.getCell(`G${daysIdx}`).border = thinBorder();

  return grandTotal;
}

// ─── Legend sheet: append active projects ─────────────────────────────────────
function updateLegendSheet(wb: ExcelJS.Workbook, projects: ProjectInfo[]) {
  let legend = wb.getWorksheet('Legend');
  if (!legend) legend = wb.addWorksheet('Legend');

  // Set column widths for the Active Projects table (B/C/D)
  legend.getColumn('B').width = 40;
  legend.getColumn('C').width = 20;
  legend.getColumn('D').width = 15;

  // Find last used row to append below existing content
  let startRow = 1;
  legend.eachRow(() => { startRow++; });
  if (startRow > 1) startRow++; // blank separator row

  const sFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10 };

  // Section heading
  legend.getCell(`B${startRow}`).value = 'Active Projects';
  legend.getCell(`B${startRow}`).font = { ...sFont, bold: true, size: 11 };
  startRow++;

  // Column headers
  legend.getCell(`B${startRow}`).value = 'Name';
  legend.getCell(`B${startRow}`).font = { ...sFont, bold: true };
  legend.getCell(`B${startRow}`).fill = solidFill(COLOR_GRAY);
  legend.getCell(`B${startRow}`).border = thinBorder();
  legend.getCell(`C${startRow}`).value = 'Code';
  legend.getCell(`C${startRow}`).font = { ...sFont, bold: true };
  legend.getCell(`C${startRow}`).fill = solidFill(COLOR_GRAY);
  legend.getCell(`C${startRow}`).border = thinBorder();
  legend.getCell(`D${startRow}`).value = 'Type';
  legend.getCell(`D${startRow}`).font = { ...sFont, bold: true };
  legend.getCell(`D${startRow}`).fill = solidFill(COLOR_GRAY);
  legend.getCell(`D${startRow}`).border = thinBorder();
  startRow++;

  // Project rows (active only)
  for (const p of projects.filter((p) => p.isActive)) {
    legend.getCell(`B${startRow}`).value = p.name;
    legend.getCell(`B${startRow}`).font = sFont;
    legend.getCell(`B${startRow}`).border = thinBorder();
    legend.getCell(`C${startRow}`).value = p.code;
    legend.getCell(`C${startRow}`).font = sFont;
    legend.getCell(`C${startRow}`).border = thinBorder();
    legend.getCell(`D${startRow}`).value = p.type;
    legend.getCell(`D${startRow}`).font = sFont;
    legend.getCell(`D${startRow}`).border = thinBorder();
    startRow++;
  }

}

// ─── Public: Export single timesheet ─────────────────────────────────────────
export const exportSingleTimesheetToExcel = async (
  ts: {
    user: { firstName: string; lastName: string };
    month: number;
    year: number;
    entries: Array<{
      date: string;
      description?: string;
      approvedHours?: number | null;
      loggedHours?: number;
      project?: { name?: string; code?: string; type?: string } | null;
      task?: { name?: string } | null;
    }>;
  },
  projects?: ProjectInfo[]
) => {
  // Load template (Title + Legend + Jan sheets preserved exactly as-is)
  const tplBuf = await loadTemplateBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(tplBuf);

  // Get the "Jan" sheet
  const dataSheet = wb.getWorksheet('Jan');
  if (!dataSheet) throw new Error('Template missing "Jan" sheet');

  // Rename sheet to correct month_name
  const monthName = MONTH_NAMES[ts.month] || `Month_${ts.month}`;
  dataSheet.name = `${monthName}_${ts.user.firstName}`.substring(0, 31);

  // Fill data
  fillDataSheet(dataSheet, {
    employeeName: `${ts.user.firstName} ${ts.user.lastName}`,
    month: ts.month,
    year: ts.year,
    entries: ts.entries,
  });

  // Populate Legend tab with active projects
  if (projects && projects.length > 0) {
    updateLegendSheet(wb, projects);
  }

  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const yyyy_mm = `${ts.year}_${String(ts.month).padStart(2, '0')}`;
  const filename = `${yyyy_mm} Conarum Timesheet BTP - ${ts.user.firstName} ${ts.user.lastName}.xlsx`;
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
};

// ─── Public: Export batch ────────────────────────────────────────────────────
export const exportBatchToExcel = async (batch: TimesheetBatchDetail, projects?: ProjectInfo[]) => {
  const tplBuf = await loadTemplateBuffer();

  // Load template – keep Title + Legend intact, remove "Jan" template sheet
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(tplBuf);

  // Extract logo image from template before removing the Jan sheet
  let logoImageId: number | undefined;
  const janSheet = wb.getWorksheet('Jan');
  if (janSheet) {
    const imgs = janSheet.getImages();
    if (imgs.length > 0) {
      // The image is already in the workbook, just grab its ID
      logoImageId = Number(imgs[0].imageId);
    }
    wb.removeWorksheet(janSheet.id);
  }

  // If logo wasn't found via Jan sheet, try loading from template separately
  if (logoImageId === undefined) {
    const tplWb2 = new ExcelJS.Workbook();
    await tplWb2.xlsx.load(tplBuf);
    const tplJan = tplWb2.getWorksheet('Jan');
    if (tplJan) {
      const imgs = tplJan.getImages();
      if (imgs.length > 0) {
        const tplImg = tplWb2.getImage(Number(imgs[0].imageId));
        if (tplImg?.buffer) {
          logoImageId = wb.addImage({
            buffer: tplImg.buffer as ArrayBuffer,
            extension: (tplImg.extension || 'png') as 'png' | 'jpeg',
          });
        }
      }
    }
  }

  for (const ts of batch.timesheets) {
    const monthName = MONTH_NAMES[ts.month] || `Month_${ts.month}`;
    const sheetName = `${monthName}_${ts.user.firstName}`.substring(0, 31);
    const ws = wb.addWorksheet(sheetName);

    // ── Column widths (from template Jan) ──
    ws.columns = [
      { width: 2.55 }, // A
      { width: 12.33 }, // B: Date
      { width: 14.44 }, // C: Type
      { width: 110 }, // D: Task
      { width: 6.55 }, // E: onsite
      { width: 8 }, // F: Hours
      { width: 48.55 }, // G: Project
      { width: 29.66 }, // H: Note
    ];

    // ── Row heights ──
    ws.getRow(1).height = 24.6;
    ws.getRow(2).height = 15.6;
    ws.getRow(3).height = 15.6;

    // ── Merged cells ──
    ws.mergeCells('B1:H1');
    ws.mergeCells('B3:D3');
    ws.mergeCells('F5:G5');
    ws.mergeCells('F6:G6');
    ws.mergeCells('F7:G7');
    ws.mergeCells('F8:G8');

    // ── Logo ──
    if (logoImageId !== undefined) {
      ws.addImage(logoImageId, {
        tl: { col: 7, row: 0.5 } as any,
        ext: { width: 182, height: 37 },
      });
    }

    // ── Header info (rows 1-12) ──
    const b1 = ws.getCell('B1');
    b1.value = 'Service Entry Sheet';
    b1.font = { bold: true, size: 20, name: 'Arial' };

    const b2 = ws.getCell('B2');
    b2.value = 'Project:';
    b2.font = { bold: true, size: 12, name: 'Arial' };
    b2.border = thinBorder();
    const d2 = ws.getCell('D2');
    d2.value = 'Conarum VN - SAP Development Services';
    d2.font = { bold: true, size: 12, name: 'Arial' };
    d2.border = thinBorder();

    ws.getCell('B4').value = 'Please indicate on each invoice';
    ws.getCell('B4').font = { italic: true, size: 10, name: 'Arial' };

    ws.getCell('B5').value = 'Customer';
    ws.getCell('B5').font = { bold: true, size: 10, name: 'Arial' };
    ws.getCell('D5').value = 'conarum GmbH & Co. KG';
    ws.getCell('D5').font = { size: 10, name: 'Calibri' };

    ws.getCell('B6').value = 'Place:';
    ws.getCell('B6').font = { bold: true, size: 10, name: 'Arial' };
    ws.getCell('D6').value = 'Germany';
    ws.getCell('D6').font = { size: 10, name: 'Calibri' };

    ws.getCell('B8').value = 'Company';
    ws.getCell('B8').font = { bold: true, size: 10, name: 'Calibri' };
    ws.getCell('D8').value = 'conarum Vietnam Company Ltd.';
    ws.getCell('D8').font = { size: 10, name: 'Calibri' };

    ws.getCell('B9').value = 'Employee';
    ws.getCell('B9').font = { bold: true, size: 10, name: 'Calibri' };

    ws.getCell('B10').value = 'Period: ';
    ws.getCell('B10').font = { bold: true, size: 10, name: 'Calibri' };

    ws.getCell('B11').value = 'Customer contact person:';
    ws.getCell('B11').font = { bold: true, size: 10, name: 'Calibri' };

    ws.getCell('E12').value = '* Write "X" if Onsite';
    ws.getCell('E12').font = { size: 10, name: 'Calibri' };

    // ── Fill dynamic data ──
    fillDataSheet(ws, {
      employeeName: `${ts.user.firstName} ${ts.user.lastName}`,
      month: ts.month,
      year: ts.year,
      entries: (ts.entries || []).map((e) => ({
        date: e.date,
        description: e.description,
        approvedHours: e.approvedHours,
        loggedHours: e.loggedHours,
        project: e.project,
        task: e.task,
      })),
    });
  }

  // Populate Legend tab with active projects
  if (projects && projects.length > 0) {
    updateLegendSheet(wb, projects);
  }

  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const yyyy_mm = format(new Date(batch.createdAt), 'yyyy_MM');
  const filename = `${yyyy_mm} Conarum Timesheet BTP - ${batch.teamLead.firstName} ${batch.teamLead.lastName}.xlsx`;
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
};
