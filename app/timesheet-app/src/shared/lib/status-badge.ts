/**
 * Shared SAP-standard status badge utilities.
 *
 * Uses only CSS custom properties declared in theme.css
 * (bg-status-*, text-status-*, border-status-*) — do NOT redeclare colours here.
 *
 * Usage:
 * <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border', timesheetStatusClass(ts.status))}>
 * {timesheetStatusLabel(ts.status)}
 * </span>
 */

// ─── Timesheet / Approval statuses ─────────────────────────────────────────

const TIMESHEET_STATUS_MAP: Record<string, string> = {
  Draft: 'bg-status-obsoleted text-status-obsoleted-text border-status-obsoleted-border',
  Submitted: 'bg-status-new text-status-new-text border-status-new-border',
  Approved: 'bg-status-completed text-status-completed-text border-status-completed-border',
  Reopened: 'bg-status-progress text-status-progress-text border-status-progress-border',
  Finished: 'bg-status-completed text-status-completed-text border-status-completed-border',
};

export function timesheetStatusClass(status: string): string {
  return (
    TIMESHEET_STATUS_MAP[status] ?? 'bg-status-obsoleted text-status-obsoleted-text border-status-obsoleted-border'
  );
}

export function timesheetStatusLabel(status: string): string {
  switch (status) {
    case 'Submitted':
      return 'Pending Approval';
    case 'Finished':
      return 'Finished';
    default:
      return status;
  }
}

// ─── TimesheetBatch statuses ────────────────────────────────────────────────
// 4 states: Pending → Sent → Done / Reopened

const BATCH_STATUS_MAP: Record<string, string> = {
  Pending:  'bg-status-new text-status-new-text border-status-new-border',
  Sent:     'bg-status-released text-status-released-text border-status-released-border',
  Done:     'bg-status-completed text-status-completed-text border-status-completed-border',
  Reopened: 'bg-status-progress text-status-progress-text border-status-progress-border',
};

export function batchStatusClass(status: string): string {
  return BATCH_STATUS_MAP[status] ?? 'bg-status-obsoleted text-status-obsoleted-text border-status-obsoleted-border';
}

export function batchStatusLabel(status: string): string {
  switch (status) {
    case 'Pending':  return 'Pending';
    case 'Sent':     return 'Sent';
    case 'Done':     return 'Done';
    case 'Reopened': return 'Reopened';
    default:         return status;
  }
}
