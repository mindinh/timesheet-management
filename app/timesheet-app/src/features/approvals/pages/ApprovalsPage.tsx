import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, FileText, Download, SlidersVertical, ArrowUp, Settings } from 'lucide-react';
import { format } from 'date-fns';
import {
  SortDialog,
  type SortOption,
  type SortByOption,
  ColumnSettingsDialog,
  type ColumnSetting,
} from '@/shared/components/dialogs';
import { getAllBatches } from '@/features/approvals/api/teamlead-api';
import type { TimesheetBatch } from '@/features/approvals/api/teamlead-api';
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore';
import { fetchTimesheetBatchById } from '@/features/admin/api/admin-api';
import { exportBatchToExcel } from '@/features/admin/utils/export-excel';
import DataTable, { type DataTableColumn, type SelectionConfig } from '@/shared/components/common/DataTable';
import { FilterBar } from '@/shared/components/filterbar/FilterBar';
import { TableActionBar } from '@/shared/components/common/TableActionBar';
import type { FilterFieldConfig, FilterValues } from '@/shared/components/filterbar/types';
import type { ActionItem } from '@/types/component-config.types';
import { useTranslation } from 'react-i18next';

// ─── Constants ──────────────────────────────────────────────

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const FILTER_CONFIG: FilterFieldConfig[] = [
  { key: 'search', label: 'Search', type: 'text', placeholder: 'Search by period...' },
  {
    key: 'status', label: 'Status', type: 'multiselect',
    options: [
      { label: 'Pending',  value: 'Pending' },
      { label: 'Sent',     value: 'Sent' },
      { label: 'Done',     value: 'Done' },
      { label: 'Reopened', value: 'Reopened' },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────

export default function ApprovalsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, fetchCurrentUser } = useTimesheetStore();

  const [batches, setBatches] = useState<TimesheetBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterValues, setFilterValues] = useState<FilterValues>({ search: '', status: [] });
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>({ search: '', status: [] });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentSort, setCurrentSort] = useState<SortOption>({ by: 'createdAt', order: 'descending' });

  const [columnSettings, setColumnSettings] = useState<ColumnSetting[]>([
    { key: 'period', label: 'Period (Created At)', visible: true },
    { key: 'contains', label: 'Contains', visible: true },
    { key: 'status', label: 'Status', visible: true },
    { key: 'actions', label: 'Actions', visible: true },
  ]);

  const sortByOptions: SortByOption[] = useMemo(() => [
    { key: 'createdAt', value: 'createdAt', label: 'Created Date' },
    { key: 'status', value: 'status', label: 'Status' },
  ], []);

  useEffect(() => { if (!currentUser) fetchCurrentUser(); }, [currentUser, fetchCurrentUser]);

  const loadBatches = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getAllBatches();
      setBatches(data);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to load batches:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { if (currentUser) loadBatches(); }, [currentUser, loadBatches]);

  const handleExportBatch = useCallback(async (batchId: string) => {
    try {
      setIsExporting(true);
      const detail = await fetchTimesheetBatchById(batchId);
      await exportBatchToExcel(detail);
    } catch (error) {
      console.error('Failed to export batch:', error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  // ─── Filter + Sort ─────────────────────────────────────────
  const filteredBatches = useMemo(() => {
    let result = [...batches];

    const search = ((appliedFilters.search as string) || '').toLowerCase();
    if (search) {
      result = result.filter((b) => {
        const createdDate = b.createdAt ? new Date(b.createdAt) : null;
        const periodStr = createdDate
          ? `${MONTH_NAMES[createdDate.getMonth() + 1]} ${createdDate.getFullYear()}`.toLowerCase()
          : '';
        return periodStr.includes(search) || b.status.toLowerCase().includes(search);
      });
    }

    const statuses = appliedFilters.status as string[];
    if (statuses?.length > 0) result = result.filter((b) => statuses.includes(b.status));

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (currentSort.by === 'createdAt') {
        cmp = (a.createdAt ? new Date(a.createdAt).getTime() : 0) -
              (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      } else if (currentSort.by === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return currentSort.order === 'ascending' ? cmp : -cmp;
    });

    return result;
  }, [batches, appliedFilters, currentSort]);

  // ─── Toolbar ───────────────────────────────────────────────
  const toolbarActions: ActionItem[] = useMemo(() => [
    {
      id: 'showDetail',
      icon: FileText,
      group: 'primary',
      size: 'icon' as const,
      onClick: () => { if (selectedIds.size === 1) navigate(`/approvals/batch/${Array.from(selectedIds)[0]}`); },
      disabled: selectedIds.size !== 1,
      title: 'Show Detail',
    },
    {
      id: 'export',
      icon: Download,
      group: 'tools',
      size: 'icon' as const,
      onClick: () => { if (selectedIds.size === 1) handleExportBatch(Array.from(selectedIds)[0]); },
      disabled: selectedIds.size !== 1 || isExporting,
      title: 'Export to Excel',
    },
    {
      id: 'sort',
      icon: SlidersVertical,
      group: 'tools',
      size: 'icon' as const,
      onClick: () => setIsSortOpen(true),
      title: 'Sort Options',
    },
    {
      id: 'back-to-top',
      icon: ArrowUp,
      group: 'tools',
      size: 'icon' as const,
      onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      title: 'Back to Top',
    },
    {
      id: 'settings',
      icon: Settings,
      group: 'tools',
      size: 'icon' as const,
      onClick: () => setIsColumnSettingsOpen(true),
      title: 'Column Settings',
    },
    {
      id: 'refresh',
      icon: RefreshCw,
      group: 'actions',
      size: 'icon' as const,
      variant: 'ghost' as const,
      onClick: loadBatches,
      title: 'Refresh list',
    },
  ], [loadBatches, navigate, selectedIds, handleExportBatch, isExporting]);

  // ─── Selection ─────────────────────────────────────────────
  const selectionConfig: SelectionConfig = useMemo(() => ({
    enabled: true,
    mode: 'multiple' as const,
    selectedIds,
    onSelectionChange: setSelectedIds,
    getRowId: (row: TimesheetBatch) => row.id,
  }), [selectedIds]);

  // ─── Columns ───────────────────────────────────────────────
  const columns: DataTableColumn<TimesheetBatch>[] = useMemo(() => [
    {
      key: 'period',
      labelKey: 'Period (Created At)',
      width: 260,
      render: (_, batch) => {
        const createdDate = batch.createdAt ? new Date(batch.createdAt) : null;
        const monthName = createdDate ? MONTH_NAMES[createdDate.getMonth() + 1] : 'Unknown Month';
        const year = createdDate ? createdDate.getFullYear() : 'Unknown Year';
        return (
          <div className="flex items-center gap-2 py-1">
            <div>
              <div className="text-foreground font-semibold">{monthName} {year}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Created: {createdDate ? format(createdDate, 'MMM dd, yyyy') : 'No Date'}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'contains',
      labelKey: 'Contains',
      width: 160,
      render: (_, batch) => (
        <span className="inline-flex items-center justify-center bg-muted px-2.5 py-1 rounded-md text-xs font-medium border">
          {batch.timesheetCount ?? 0} timesheets
        </span>
      ),
    },
    {
      key: 'status',
      labelKey: 'Status',
      width: 160,
      render: (_, batch) => {
        const cls = [
          'inline-block px-2 py-1 rounded-full text-xs font-medium border',
          batch.status === 'Pending'  ? 'bg-status-new text-status-new-text border-status-new-border'
          : batch.status === 'Sent'  ? 'bg-status-released text-status-released-text border-status-released-border'
          : batch.status === 'Done'  ? 'bg-status-completed text-status-completed-text border-status-completed-border'
          : 'bg-status-progress text-status-progress-text border-status-progress-border',
        ].join(' ');
        return <span className={cls}>{batch.status}</span>;
      },
    },
    {
      key: 'actions',
      labelKey: 'Actions',
      width: 80,
      render: (_, batch) => (
        <div className="flex items-center gap-2">
          <button
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            disabled={isExporting}
            onClick={(e) => { e.stopPropagation(); handleExportBatch(batch.id); }}
            title="Export to Excel"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ], [isExporting, handleExportBatch]);

  // Apply column visibility
  const visibleColumns = useMemo(() =>
    columns.map((col) => {
      const setting = columnSettings.find((s) => s.key === col.key);
      return { ...col, visible: setting ? setting.visible : true };
    }),
    [columns, columnSettings]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {t('approvalsPage.description', 'Review employee timesheets or batch them to final admins.')}
        </p>
      </div>

      {/* FilterBar */}
      <FilterBar
        config={FILTER_CONFIG}
        values={filterValues}
        onChange={setFilterValues}
        onApply={setAppliedFilters}
        isLoading={isLoading}
        defaultExpanded={true}
      />

      {/* Table Card */}
      <div className="bg-card border-0 shadow-sm rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">
            {t('approvalsPage.title', 'Approvals')}{' '}
            <span className="text-primary">
              ({selectedIds.size > 0 ? `${selectedIds.size} / ${filteredBatches.length}` : filteredBatches.length})
            </span>
          </h2>
          <TableActionBar actions={toolbarActions} align="right" />
        </div>

        {/* DataTable */}
        <DataTable<TimesheetBatch>
          data={filteredBatches}
          columns={visibleColumns}
          isLoading={isLoading}
          selection={selectionConfig}
          onRowClick={(row) => navigate(`/approvals/batch/${row.id}`)}
          variant="borderless"
          className="border-0 rounded-none"
          showFooter={false}
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
    </div>
  );
}
