import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, History, SlidersVertical, ArrowUp, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { DataTable } from '@/shared/components/common/DataTable';
import type { DataTableColumn, SelectionConfig } from '@/shared/components/common/DataTable';
import {
  FilterBar,
  type FilterFieldConfig,
  type FilterValues,
} from '@/shared/components/filterbar';
import { TableActionBar } from '@/shared/components/common/TableActionBar';
import {
  SortDialog,
  type SortOption,
  type SortByOption,
  ColumnSettingsDialog,
  type ColumnSetting,
} from '@/shared/components/dialogs';
import type { ActionItem } from '@/types/component-config.types';
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore';
import { getAllTimesheets, getTimesheetDetail } from '@/features/timesheet/api/timesheet-api';
import { AuditHistoryDialog } from '@/features/timesheet/components/AuditHistoryDialog';
import type { Timesheet, ApprovalHistory } from '@/shared/types';
import { useTranslation } from 'react-i18next';

// ─── Constants ──────────────────────────────────────────────

const statusColors: Record<string, string> = {
  Draft: 'bg-status-obsoleted text-status-obsoleted-text border-status-obsoleted-border',
  Submitted: 'bg-status-sent text-status-sent-text border-status-sent-border',
  Approved_By_TeamLead: 'bg-status-completed text-status-completed-text border-status-completed-border',
  Approved: 'bg-status-completed text-status-completed-text border-status-completed-border',
  Reopened: 'bg-status-new text-status-new-text border-status-new-border',
  Finished: 'bg-status-completed text-status-completed-text border-status-completed-border',
};

const MONTH_NAMES = [
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

const currentYear = new Date().getFullYear();

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - 2 + i),
  label: String(currentYear - 2 + i),
}));

const MONTH_OPTIONS = MONTH_NAMES.slice(1).map((name, i) => ({
  value: String(i + 1),
  label: name,
}));

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Reopened', label: 'Reopened for Edit' },
  { value: 'Finished', label: 'Finished' },
];

// ─── FilterBar Config ───────────────────────────────────────

const FILTER_CONFIG: FilterFieldConfig[] = [
  {
    key: 'year',
    label: 'Year',
    type: 'multiselect',
    options: YEAR_OPTIONS,
    placeholder: 'All Years',
  },
  {
    key: 'month',
    label: 'Month',
    type: 'multiselect',
    options: MONTH_OPTIONS,
    placeholder: 'All Months',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'multiselect',
    options: STATUS_OPTIONS,
    placeholder: 'All Statuses',
  },
];

// ─── Component ──────────────────────────────────────────────

export default function TimesheetListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, fetchCurrentUser } = useTimesheetStore();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);

  // FilterBar state — all multi-select fields default to empty array (= show all)
  const [filterValues, setFilterValues] = useState<FilterValues>({ year: [], month: [], status: [] });

  // Checkbox selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Audit History dialog state ──────────────────────────
  const [auditDialog, setAuditDialog] = useState<{
    open: boolean;
    loading: boolean;
    history: ApprovalHistory[];
    periodLabel: string;
  }>({ open: false, loading: false, history: [], periodLabel: '' });

  const handleOpenAudit = useCallback(async (ts: Timesheet) => {
    const label = `${MONTH_NAMES[ts.month]} ${ts.year}`;
    setAuditDialog({ open: true, loading: true, history: [], periodLabel: label });
    try {
      const detail = await getTimesheetDetail(ts.id);
      setAuditDialog((prev) => ({
        ...prev,
        loading: false,
        history: detail.approvalHistory ?? [],
      }));
    } catch {
      setAuditDialog((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // Toolbar dialogs
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [currentSort, setCurrentSort] = useState<SortOption>({ by: 'year', order: 'descending' });
  const [columnSettings, setColumnSettings] = useState<ColumnSetting[]>([
    { key: 'period', label: 'Period', visible: true },
    { key: 'status', label: 'Status', visible: true },
    { key: 'totalHours', label: 'Total Hours', visible: true },
    { key: 'submitDate', label: 'Submitted', visible: true },
    { key: 'approveDate', label: 'Approved', visible: true },
    { key: 'actions', label: 'Actions', visible: true },
  ]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (!currentUser) return;

    let isActive = true;
    setLoading(true);

    getAllTimesheets(currentUser.id)
      .then((data) => {
        if (isActive) setTimesheets(data);
      })
      .catch(console.error)
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  // Apply filters — all fields are multi-select arrays; empty = no filter
  const filteredTimesheets = useMemo(() => {
    let result = timesheets;

    const years = filterValues.year as string[];
    if (years && years.length > 0) {
      result = result.filter((ts) => years.includes(String(ts.year)));
    }

    const months = filterValues.month as string[];
    if (months && months.length > 0) {
      result = result.filter((ts) => months.includes(String(ts.month)));
    }

    const statuses = filterValues.status as string[];
    if (statuses && statuses.length > 0) {
      result = result.filter((ts) => {
        // 'Approved' also includes legacy 'Approved_By_TeamLead'
        if (statuses.includes('Approved')) {
          return statuses.includes(ts.status) || ts.status === 'Approved_By_TeamLead';
        }
        return statuses.includes(ts.status);
      });
    }

    // Sort: Reopened first, then year desc, month desc
    result = [...result].sort((a, b) => {
      if (a.status === 'Reopened' && b.status !== 'Reopened') return -1;
      if (b.status === 'Reopened' && a.status !== 'Reopened') return 1;
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return result;
  }, [timesheets, filterValues]);

  const handleApplyFilters = useCallback((_values: FilterValues) => {
    // Filtering is automatically applied via useMemo; this keeps the Go button working
  }, []);

  const handleView = (ts: Timesheet) => {
    navigate(`/timesheet?month=${ts.month}&year=${ts.year}`);
  };

  const sortByOptions: SortByOption[] = useMemo(
    () => [
      { key: 'year', value: 'year', label: 'Year' },
      { key: 'month', value: 'month', label: 'Month' },
      { key: 'status', value: 'status', label: 'Status' },
      { key: 'totalHours', value: 'totalHours', label: 'Total Hours' },
    ],
    []
  );

  const toolbarActions: ActionItem[] = useMemo(
    () => [
      {
        id: 'sort',
        icon: SlidersVertical,
        group: 'tools',
        size: 'icon',
        onClick: () => setIsSortOpen(true),
        title: 'Sort Options',
      },
      {
        id: 'back-to-top',
        icon: ArrowUp,
        group: 'tools',
        size: 'icon',
        onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        title: 'Back to Top',
      },
      {
        id: 'settings',
        icon: Settings,
        group: 'tools',
        size: 'icon',
        onClick: () => setIsColumnSettingsOpen(true),
        title: 'Column Settings',
      },
      {
        id: 'refresh',
        icon: RefreshCw,
        group: 'actions',
        size: 'icon',
        variant: 'ghost' as const,
        onClick: () => {
          if (currentUser) {
            setLoading(true);
            getAllTimesheets(currentUser.id)
              .then(setTimesheets)
              .catch(console.error)
              .finally(() => setLoading(false));
          }
        },
        title: 'Refresh',
      },
    ],
    [currentUser]
  );

  // ─── Selection Config ───────────────────────────────────
  const selectionConfig: SelectionConfig = useMemo(
    () => ({
      enabled: true,
      mode: 'multiple' as const,
      selectedIds,
      onSelectionChange: setSelectedIds,
      getRowId: (row: Timesheet) => row.id,
    }),
    [selectedIds]
  );

  // ─── Column Definitions (DataTable format) ──────────────
  const columns: DataTableColumn<Timesheet>[] = useMemo(
    () => [
      {
        key: 'period',
        labelKey: 'timesheets.table.period',
        flex: 1.5,
        render: (_value: unknown, row: Timesheet) => (
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate" title={`${MONTH_NAMES[row.month]} ${row.year}`}>
              {MONTH_NAMES[row.month]} {row.year}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        labelKey: 'timesheets.table.status',
        flex: 1.5,
        render: (_value: unknown, row: Timesheet) => (
          <Badge className={`${statusColors[row.status] || statusColors.Draft} border whitespace-nowrap`} variant="secondary">
            {row.status.replace(/_/g, ' ')}
          </Badge>
        ),
      },
      {
        key: 'totalHours',
        labelKey: 'timesheets.table.totalHours',
        flex: 1,
        render: (_value: unknown, row: Timesheet) => (
          <span className="font-semibold whitespace-nowrap">{(row.totalHours || 0).toFixed(1)}h</span>
        ),
      },
      {
        key: 'workDays',
        label: t('timesheets.table.workDays', 'Work Days'),
        labelKey: 'timesheets.table.workDays',
        flex: 1,
        render: (_value: unknown, row: Timesheet) => {
          const days = (row.totalHours || 0) / 8;
          return (
            <span className="font-semibold text-primary whitespace-nowrap" title={`${(row.totalHours || 0).toFixed(1)}h ÷ 8h`}>
              {days.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">{t('timesheets.table.daysCount', 'days')}</span>
            </span>
          );
        },
      },
      {
        key: 'submitDate',
        labelKey: 'timesheets.table.submitted',
        flex: 1.5,
        render: (_value: unknown, row: Timesheet) => {
          const label = row.submitDate ? format(new Date(row.submitDate), 'MMM dd, yyyy') : '—';
          return (
            <span className="text-muted-foreground text-sm truncate" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'approveDate',
        labelKey: 'timesheets.table.approved',
        flex: 1.5,
        render: (_value: unknown, row: Timesheet) => {
          const label = row.approveDate ? format(new Date(row.approveDate), 'MMM dd, yyyy') : '—';
          return (
            <span className="text-muted-foreground text-sm truncate" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'actions',
        labelKey: 'timesheets.table.actions',
        flex: 1,
        render: (_value: unknown, row: Timesheet) => (
          <div className="flex items-center gap-1">
            {row.status !== 'Draft' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAudit(row);
                }}
                title="View Audit History"
              >
                <History className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, navigate, handleOpenAudit]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{t('timesheets.description')}</p>
        <Button onClick={() => navigate('/timesheet')}>
          <Calendar className="h-4 w-4 mr-2" />
          {t('timesheets.logTimesheet')}
        </Button>
      </div>

      {/* FilterBar */}
      <FilterBar
        config={FILTER_CONFIG}
        values={filterValues}
        onChange={setFilterValues}
        onApply={handleApplyFilters}
        isLoading={loading}
      />

      {/* Table Card — wraps toolbar + table like Projects page */}
      <div className="bg-card border-0 shadow-sm rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">
            {t('timesheets.title')} <span className="text-primary">({filteredTimesheets.length})</span>
          </h2>
          <TableActionBar actions={toolbarActions} align="right" />
        </div>

        {/* DataTable */}
        <DataTable<Timesheet>
          data={filteredTimesheets}
          columns={columns}
          isLoading={loading}
          onRowClick={handleView}
          selection={selectionConfig}
          emptyMessageKey="timesheets.noTimesheets"
          showFooter={false}
          variant="borderless"
          className="border-0 rounded-none"
        />
      </div>

      {/* Sort Dialog */}
      <SortDialog
        open={isSortOpen}
        onClose={() => setIsSortOpen(false)}
        onApply={setCurrentSort}
        sortByOptions={sortByOptions}
        defaultSort={currentSort}
      />

      {/* Column Settings Dialog */}
      <ColumnSettingsDialog
        open={isColumnSettingsOpen}
        onClose={() => setIsColumnSettingsOpen(false)}
        columns={columnSettings}
        onApply={setColumnSettings}
      />

      {/* Audit History Dialog */}
      <AuditHistoryDialog
        open={auditDialog.open}
        onOpenChange={(open) => setAuditDialog((prev) => ({ ...prev, open }))}
        history={auditDialog.history}
        periodLabel={auditDialog.periodLabel}
      />
    </div>
  );
}
