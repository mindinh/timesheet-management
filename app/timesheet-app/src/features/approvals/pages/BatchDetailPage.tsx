import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  ArrowLeft,
  CheckCircle,
  RotateCcw,
  FileText,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  History,
  Download,
  Pencil,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { fmtDate, fmtDateTime, fmtPeriod, fmtNumber } from '@/shared/lib/formatters';
import {
  getTimesheetDetailByTeamLead,
  approveTimesheetByTeamLead,
  reopenTimesheetByTeamLead,
  modifyEntryHoursByTeamLead,
  type TimesheetBatch as TLBatch,
} from '@/features/approvals/api/teamlead-api';
import { exportSingleTimesheetToExcel } from '@/features/admin/utils/export-excel';
import type { Timesheet, TimesheetEntry } from '@/shared/types';
import { DataTable, type DataTableColumn } from '@/shared/components/common/DataTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Textarea } from '@/shared/components/ui/textarea';
import StatusDialog from '@/shared/components/common/StatusDialog';
import { TEAMLEAD_URL } from '@/features/timesheet/api/timesheet-url';
import { api } from '@/shared/api/http';
import { cn } from '@/shared/lib/utils';
import {
  batchStatusClass,
  batchStatusLabel,
  timesheetStatusClass,
  timesheetStatusLabel,
} from '@/shared/lib/status-badge';

// ─── Types ────────────────────────────────────────────────────────────────────
/** Draft edits keyed by entryId */
type EditDraft = Record<string, string>;

// ─── API helpers ─────────────────────────────────────────────────────────────
async function fetchBatchDetail(batchId: string): Promise<{ batch: TLBatch; timesheets: any[] }> {
  const [batchData, tsData] = await Promise.all([
    api.get(`${TEAMLEAD_URL.batches}(${batchId})`),
    api.get(TEAMLEAD_URL.timesheets, {
      $filter: `batch_ID eq ${batchId}`,
      $expand: 'user,approvalHistory($expand=actor),entries($select=ID,loggedHours,approvedHours)',
    }),
  ]);
  const b = batchData as Record<string, any>;
  const batch: TLBatch = {
    id: String(b.ID || b.id),
    month: Number(b.month),
    year: Number(b.year),
    status: String(b.status || 'Pending'),
    createdAt: b.createdAt as string,
  };
  const rawList = ((tsData as any)?.value ?? tsData) as Record<string, any>[];
  // Compute totalHours from entries so hours are always accurate
  const timesheets = rawList.map((ts) => {
    const entries = Array.isArray(ts.entries) ? ts.entries : [];
    const computed = entries.reduce((sum: number, e: any) => sum + (Number(e.loggedHours) || 0), 0);
    return { ...ts, totalHours: computed };
  });
  return { batch, timesheets };
}

// ─── Variance helper ──────────────────────────────────────────────────────────
function VarianceBadge({ logged, approved }: { logged: number; approved?: number | null }) {
  const effective = approved !== null && approved !== undefined ? Number(approved) : Number(logged);
  const diff = effective - Number(logged);
  if (diff === 0)
    return (
      <span className="text-muted-foreground text-sm">
        <Minus className="h-3.5 w-3.5 inline" />
      </span>
    );
  const isPos = diff > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border',
        isPos
          ? 'bg-status-completed text-status-completed-text border-status-completed-border'
          : 'bg-status-new text-status-new-text border-status-new-border'
      )}
    >
      {isPos ? <TrendingUp className="h-3 w-3 shrink-0" /> : <TrendingDown className="h-3 w-3 shrink-0" />}
      {isPos ? '+' : ''}
      {fmtNumber(diff, 1)}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const [batch, setBatch] = useState<TLBatch | null>(null);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [tsDetails, setTsDetails] = useState<Record<string, Timesheet & { entries: TimesheetEntry[] }>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  // Edit mode: which tsId is in edit mode, and its draft edits
  const [editModeTsId, setEditModeTsId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({});
  const [isSaving, setIsSaving] = useState(false);

  const [exportingTsId, setExportingTsId] = useState<string | null>(null);
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    variant: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
  }>({ open: false, variant: 'info', title: '' });
  const [reopenDialog, setReopenDialog] = useState<{ open: boolean; tsId: string; comment: string }>({
    open: false,
    tsId: '',
    comment: '',
  });

  const loadBatch = async () => {
    if (!batchId) return;
    setIsLoading(true);
    try {
      const { batch, timesheets } = await fetchBatchDetail(batchId);
      setBatch(batch);
      setTimesheets(timesheets);
    } catch (e) {
      console.error('Failed to load batch', e);
      setStatusDialog({ open: true, variant: 'error', title: 'Error', description: 'Failed to load batch details.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBatch();
  }, [batchId]);

  const toggleTimesheet = async (tsId: string) => {
    const expanding = !expandedRows[tsId];
    setExpandedRows((prev) => ({ ...prev, [tsId]: expanding }));
    if (expanding && !tsDetails[tsId]) {
      setLoadingDetails((prev) => ({ ...prev, [tsId]: true }));
      try {
        const detail = await getTimesheetDetailByTeamLead(tsId);
        setTsDetails((prev) => ({ ...prev, [tsId]: detail }));
      } catch (e) {
        console.error('Failed to load entries', e);
      } finally {
        setLoadingDetails((prev) => ({ ...prev, [tsId]: false }));
      }
    }
  };

  // ── Edit mode ─────────────────────────────────────────────────────────────
  const enterEditMode = (tsId: string) => {
    const entries = tsDetails[tsId]?.entries ?? [];
    const draft: EditDraft = {};
    entries.forEach((e) => {
      const effective = e.approvedHours !== undefined && e.approvedHours !== null ? e.approvedHours : e.hours;
      draft[e.id] = String(effective ?? 0);
    });
    setEditDraft(draft);
    setEditModeTsId(tsId);
  };

  const cancelEditMode = () => {
    setEditModeTsId(null);
    setEditDraft({});
  };

  const saveEditMode = useCallback(
    async (tsId: string) => {
      const entries = tsDetails[tsId]?.entries ?? [];
      const dirty = entries.filter((e) => {
        const newVal = parseFloat(editDraft[e.id] ?? String(e.hours));
        const oldVal =
          e.approvedHours !== undefined && e.approvedHours !== null ? Number(e.approvedHours) : Number(e.hours);
        return !isNaN(newVal) && newVal !== oldVal;
      });

      if (dirty.length === 0) {
        cancelEditMode();
        return;
      }

      setIsSaving(true);
      try {
        await Promise.all(dirty.map((e) => modifyEntryHoursByTeamLead(e.id, parseFloat(editDraft[e.id]))));
        // Refresh entries
        const updated = await getTimesheetDetailByTeamLead(tsId);
        setTsDetails((prev) => ({ ...prev, [tsId]: updated }));
        setStatusDialog({
          open: true,
          variant: 'success',
          title: 'Saved',
          description: `Updated ${dirty.length} entr${dirty.length > 1 ? 'ies' : 'y'}.`,
        });
      } catch (e: any) {
        setStatusDialog({
          open: true,
          variant: 'error',
          title: 'Save Failed',
          description: e?.message || 'Could not save changes.',
        });
      } finally {
        setIsSaving(false);
        setEditModeTsId(null);
        setEditDraft({});
      }
    },
    [tsDetails, editDraft]
  );

  // ── Other actions ─────────────────────────────────────────────────────────
  const handleApprove = async (tsId: string) => {
    try {
      await approveTimesheetByTeamLead(tsId);
      setStatusDialog({
        open: true,
        variant: 'success',
        title: 'Approved',
        description: 'Timesheet approved successfully.',
      });
      loadBatch();
    } catch (e: any) {
      setStatusDialog({
        open: true,
        variant: 'error',
        title: 'Failed',
        description: e?.message || 'Failed to approve.',
      });
    }
  };

  const handleReopen = async () => {
    if (!reopenDialog.tsId || !reopenDialog.comment.trim()) return;
    try {
      await reopenTimesheetByTeamLead(reopenDialog.tsId, reopenDialog.comment);
      setStatusDialog({
        open: true,
        variant: 'success',
        title: 'Reopened',
        description: 'Timesheet returned to employee.',
      });
      setReopenDialog({ open: false, tsId: '', comment: '' });
      loadBatch();
    } catch (e: any) {
      setStatusDialog({
        open: true,
        variant: 'error',
        title: 'Failed',
        description: e?.message || 'Failed to reopen.',
      });
    }
  };

  const handleExport = async (e: React.MouseEvent, ts: any) => {
    e.stopPropagation();
    const tsId = ts.ID || ts.id;
    setExportingTsId(tsId);
    try {
      let detail = tsDetails[tsId];
      if (!detail) {
        detail = await getTimesheetDetailByTeamLead(tsId);
        setTsDetails((prev) => ({ ...prev, [tsId]: detail }));
      }
      await exportSingleTimesheetToExcel({
        user: { firstName: ts.user?.firstName ?? '', lastName: ts.user?.lastName ?? '' },
        month: ts.month,
        year: ts.year,
        entries: detail.entries || [],
      });
    } catch (e) {
      setStatusDialog({
        open: true,
        variant: 'error',
        title: 'Export Failed',
        description: 'Failed to export timesheet.',
      });
    } finally {
      setExportingTsId(null);
    }
  };

  // ── Entry columns (dynamic based on edit mode) ────────────────────────────
  const buildEntryColumns = (tsId: string): DataTableColumn<TimesheetEntry>[] => {
    const inEdit = editModeTsId === tsId;
    return [
      {
        key: 'date',
        labelKey: 'Date',
        width: 100,
        render: (_, e) => <span className="whitespace-nowrap text-sm">{fmtDate(e.date)}</span>,
      },
      {
        key: 'projectName',
        labelKey: 'Project',
        width: 160,
        render: (_, e) => {
          const type: string | undefined = (e as any).projectType;
          return (
            <div>
              <div className="font-medium text-foreground text-sm leading-snug">{e.projectName || '—'}</div>
              {type && (
                <span className="inline-flex mt-0.5 text-[10px] px-1.5 py-0.5 rounded border bg-status-obsoleted text-status-obsoleted-text border-status-obsoleted-border font-medium">
                  {type}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'taskName',
        labelKey: 'Task',
        width: 140,
        render: (_, e) => <span className="text-sm text-muted-foreground">{e.taskName || '—'}</span>,
      },
      {
        key: 'hours',
        labelKey: 'Logged (h)',
        width: 80,
        render: (_, e) => <span className="text-sm">{fmtNumber(e.hours ?? 0)}</span>,
      },
      {
        key: 'approvedHours',
        labelKey: 'Approved (h)',
        width: inEdit ? 130 : 110,
        render: (_, e) => {
          if (inEdit) {
            return (
              <Input
                type="number"
                step="0.5"
                min="0"
                className="h-7 w-20 text-sm px-2 py-0"
                value={editDraft[e.id] ?? String(e.hours ?? 0)}
                onChange={(ev) => setEditDraft((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                onClick={(ev) => ev.stopPropagation()}
              />
            );
          }
          const logged = e.hours ?? 0;
          const approved = e.approvedHours;
          const modified = approved !== undefined && approved !== null && Number(approved) !== Number(logged);
          return modified ? (
            <span className="inline-flex items-center gap-1 text-sm font-semibold bg-status-completed text-status-completed-text border border-status-completed-border px-2 py-0.5 rounded-full">
              <Pencil className="h-3 w-3 shrink-0" />
              {fmtNumber(Number(approved))}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">{fmtNumber(logged)}</span>
          );
        },
      },
      {
        key: 'variance' as any,
        labelKey: 'Variance',
        width: 90,
        render: (_, e) => {
          const logged = e.hours ?? 0;
          const appVal = inEdit
            ? parseFloat(editDraft[e.id] ?? String(logged))
            : e.approvedHours !== undefined && e.approvedHours !== null
              ? Number(e.approvedHours)
              : Number(logged);
          return <VarianceBadge logged={logged} approved={isNaN(appVal) ? logged : appVal} />;
        },
      },
      {
        key: 'description',
        labelKey: 'Description',
        width: 200,
        render: (_, e) => (
          <span className="text-sm text-muted-foreground line-clamp-2" title={e.description || ''}>
            {e.description || '—'}
          </span>
        ),
      },
    ];
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading batch details...</div>;
  }

  if (!batch) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/approvals')}
          className="pl-0 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Approvals
        </Button>
        <div className="p-8 text-center bg-card rounded-xl border">
          <p className="text-muted-foreground">Batch not found.</p>
        </div>
      </div>
    );
  }

  const period = fmtPeriod(batch.month, batch.year);
  const pendingCount = timesheets.filter((ts) => ts.status === 'Submitted').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Button
        variant="ghost"
        onClick={() => navigate('/approvals')}
        className="pl-0 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Approvals
      </Button>

      {/* Header Card */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-xl font-bold text-primary">Batch – {period}</h1>
          <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', batchStatusClass(batch.status))}>
            {batchStatusLabel(batch.status)}
          </span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-status-new text-status-new-text border-status-new-border">
              {pendingCount} pending
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Period</p>
              <p className="font-semibold text-foreground text-sm">{period}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Timesheets</p>
              <p className="font-semibold text-foreground text-sm">{timesheets.length}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Total Hours</p>
              <p className="font-semibold text-foreground text-sm">
                {fmtNumber(timesheets.reduce((s: number, ts: any) => s + (Number(ts.totalHours) || 0), 0), 1)} h
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <History className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Work Days</p>
              <p className="font-semibold text-foreground text-sm">
                {fmtNumber(timesheets.reduce((s: number, ts: any) => s + (Number(ts.totalHours) || 0), 0) / 8, 1)} d
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Timesheets List */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">Included Timesheets</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Click a row to expand and review entries.</p>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full border">
            {timesheets.length} timesheet{timesheets.length !== 1 ? 's' : ''}
          </span>
        </div>

        {timesheets.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No timesheets found in this batch</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {timesheets.map((ts) => {
              const tsId = ts.ID || ts.id;
              const isEditMode = editModeTsId === tsId;
              const isExpanded = !!expandedRows[tsId];
              const totalLogged = tsDetails[tsId]
                ? tsDetails[tsId].entries.reduce((s, e) => s + (e.hours ?? 0), 0)
                : Number(ts.totalHours) || 0;
              return (
                <div key={tsId} className="flex flex-col">
                  {/* ── Single row: info + buttons ── */}
                  <div
                    className={cn(
                      'px-4 py-3 sm:px-6 transition-colors',
                      isEditMode ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Chevron */}
                      <button
                        className="text-muted-foreground shrink-0 cursor-pointer"
                        onClick={() => toggleTimesheet(tsId)}
                      >
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {/* Avatar */}
                      <div
                        className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 text-sm cursor-pointer"
                        onClick={() => toggleTimesheet(tsId)}
                      >
                        {ts.user?.firstName?.[0]}{ts.user?.lastName?.[0]}
                      </div>
                      {/* User info */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleTimesheet(tsId)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-sm">{ts.user?.firstName} {ts.user?.lastName}</h3>
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border', timesheetStatusClass(ts.status))}>
                            {timesheetStatusLabel(ts.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {ts.month && ts.year ? fmtPeriod(ts.month, ts.year) : '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {fmtNumber(totalLogged, 1)} h
                            <span className="text-muted-foreground/60">·</span>
                            {fmtNumber(totalLogged / 8, 1)} d
                          </span>
                        </div>
                      </div>
                      {/* Action buttons — same row, right side */}
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {isEditMode ? (
                          <>
                            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-7 text-xs"
                              onClick={() => saveEditMode(tsId)} disabled={isSaving}>
                              <Save className="mr-1 h-3 w-3" />{isSaving ? 'Saving…' : 'Save'}
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs"
                              onClick={cancelEditMode} disabled={isSaving}>
                              <X className="mr-1 h-3 w-3" />Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            {isExpanded && tsDetails[tsId] && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:bg-primary/10"
                                onClick={() => enterEditMode(tsId)}>
                                <Pencil className="h-3 w-3" />
                                <span className="hidden sm:inline ml-1">Edit</span>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:bg-primary/10"
                              onClick={(e) => handleExport(e, ts)} disabled={exportingTsId === tsId}>
                              <Download className={cn('h-3 w-3', exportingTsId === tsId && 'animate-bounce')} />
                              <span className="hidden sm:inline ml-1">{exportingTsId === tsId ? '…' : 'Export'}</span>
                            </Button>
                            {ts.status === 'Submitted' && (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400"
                                  onClick={() => handleApprove(tsId)}>
                                  <CheckCircle className="h-3 w-3" />
                                  <span className="hidden sm:inline ml-1">Approve</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-orange-600 hover:bg-orange-50 dark:text-orange-400"
                                  onClick={() => setReopenDialog({ open: true, tsId, comment: '' })}>
                                  <RotateCcw className="h-3 w-3" />
                                  <span className="hidden sm:inline ml-1">Reopen</span>
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Expanded Entries Panel ── */}
                  {isExpanded && (
                    <div className={cn(
                      'border-t border-border bg-muted/10 px-4 py-5 sm:px-6',
                      isEditMode && 'bg-primary/5'
                    )}>
                      {loadingDetails[tsId] ? (
                        <div className="text-sm text-muted-foreground animate-pulse py-4">Loading entries…</div>
                      ) : tsDetails[tsId] ? (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                          {/* Sub-header */}
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                              {isEditMode ? '✎ Edit Mode — Approved Hours' : 'Logged Entries'}
                            </h4>
                            <div className="flex items-center gap-2">
                              {isEditMode && (
                                <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                                  Editing {Object.keys(editDraft).length} entries
                                </span>
                              )}
                              {!isEditMode && tsDetails[tsId].entries.some((e) => {
                                const a = e.approvedHours;
                                return a !== undefined && a !== null && Number(a) !== Number(e.hours ?? 0);
                              }) && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-status-completed-text bg-status-completed border border-status-completed-border px-2 py-0.5 rounded-full">
                                  <Pencil className="h-3 w-3" /> Modified hours
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Entries table */}
                          {tsDetails[tsId].entries.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">No entries found.</p>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-border/50">
                              <DataTable<any>
                                data={tsDetails[tsId].entries}
                                columns={buildEntryColumns(tsId)}
                                isLoading={false}
                                variant="borderless"
                                showFooter={false}
                              />
                            </div>
                          )}

                          {/* ── Totals footer ── */}
                          <div className="flex items-center justify-end gap-6 pt-3 border-t border-border/40">
                            <div className="text-right">
                              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total Logged</p>
                              <p className="text-sm font-bold text-foreground">
                                {fmtNumber(totalLogged, 1)} h &nbsp;/&nbsp; {fmtNumber(totalLogged / 8, 2)} d
                              </p>
                            </div>
                            {isEditMode && (() => {
                              const draftTotal = tsDetails[tsId].entries.reduce((s, e) => {
                                const v = parseFloat(editDraft[e.id] ?? String(e.hours ?? 0));
                                return s + (isNaN(v) ? (e.hours ?? 0) : v);
                              }, 0);
                              return (
                                <div className="text-right">
                                  <p className="text-[11px] text-primary uppercase tracking-wide">New Total</p>
                                  <p className="text-sm font-bold text-primary">
                                    {fmtNumber(draftTotal, 1)} h &nbsp;/&nbsp; {fmtNumber(draftTotal / 8, 2)} d
                                  </p>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Approval History */}
                          {ts.approvalHistory?.length > 0 && (
                            <div className="mt-2 pt-4 border-t border-border/50">
                              <h4 className="font-semibold text-xs flex items-center gap-2 mb-3 text-muted-foreground uppercase tracking-wider">
                                <History className="h-3.5 w-3.5" /> Approval History
                              </h4>
                              <div className="space-y-2">
                                {ts.approvalHistory.map((log: any) => (
                                  <div key={log.ID} className="flex gap-3 text-sm border-l-2 border-muted pl-3 pb-1">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-foreground text-xs">
                                          {log.actor?.firstName} {log.actor?.lastName}
                                        </span>
                                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium border', timesheetStatusClass(log.action))}>
                                          {log.action}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-auto">{fmtDateTime(log.timestamp)}</span>
                                      </div>
                                      {log.comment && <p className="text-muted-foreground mt-0.5 text-xs">{log.comment}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-destructive py-4">Failed to load entries.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status Dialog */}
      <StatusDialog
        open={statusDialog.open}
        onOpenChange={(open) => setStatusDialog((prev) => ({ ...prev, open }))}
        variant={statusDialog.variant}
        title={statusDialog.title}
        description={statusDialog.description}
      />

      {/* Reopen Dialog */}
      <Dialog
        open={reopenDialog.open}
        onOpenChange={(open) => !open && setReopenDialog({ open: false, tsId: '', comment: '' })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <RotateCcw className="h-5 w-5" /> Reopen for Edit
            </DialogTitle>
            <DialogDescription>
              This timesheet will be returned to the employee with status <strong>Reopened</strong> so they can make
              changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <label className="text-sm font-medium text-foreground">
              Reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              className="min-h-[100px] resize-none"
              placeholder="Please provide a reason for reopening..."
              value={reopenDialog.comment}
              onChange={(e) => setReopenDialog((prev) => ({ ...prev, comment: e.target.value }))}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenDialog({ open: false, tsId: '', comment: '' })}>
              Cancel
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleReopen}
              disabled={!reopenDialog.comment.trim()}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reopen for Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
