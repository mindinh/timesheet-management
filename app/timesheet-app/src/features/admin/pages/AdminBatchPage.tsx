import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, FileText, Download, SlidersVertical, ArrowUp, Settings } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/shared/components/ui/button';
import {
  SortDialog,
  type SortOption,
  type SortByOption,
  ColumnSettingsDialog,
  type ColumnSetting,
} from '@/shared/components/dialogs';
import { fetchTimesheetBatches, fetchTimesheetBatchById } from '@/features/admin/api/admin-api';
import type { TimesheetBatch } from '@/features/admin/api/admin-api';
import { exportBatchToExcel } from '@/features/admin/utils/export-excel';
import { cn } from '@/shared/lib/utils';

import DataTable, { type DataTableColumn, type SelectionConfig } from '@/shared/components/common/DataTable';
import { FilterBar } from '@/shared/components/filterbar/FilterBar';
import { TableActionBar } from '@/shared/components/common/TableActionBar';
import type { FilterFieldConfig, FilterValues, DateRange } from '@/shared/components/filterbar/types';
import type { ActionItem } from '@/types/component-config.types';

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

// We'll define the static parts of FILTER_CONFIG outside the component
// The dynamic parts (like options) will be added inside the component via useMemo
const BASE_FILTER_CONFIG: Partial<FilterFieldConfig>[] = [
  {
    key: 'search',
    label: 'Search',
    type: 'text',
    placeholder: 'Search by Batch ID...',
  },
  {
    key: 'teamLead',
    label: 'Team Lead',
    type: 'multiselect',
  },
  {
    key: 'createdAt',
    label: 'Created Date',
    type: 'dateRange',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'multiselect',
    options: [
      { label: 'Pending',  value: 'Pending' },
      { label: 'Sent',     value: 'Sent' },
      { label: 'Done',     value: 'Done' },
      { label: 'Reopened', value: 'Reopened' },
    ],
  },
];

export default function AdminBatchPage() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<TimesheetBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [filterValues, setFilterValues] = useState<FilterValues>({ status: [], teamLead: [] });
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>({ status: [], teamLead: [] });

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog & Action states
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Sort state
  const [currentSort, setCurrentSort] = useState<SortOption>({
    by: 'createdAt',
    order: 'descending',
  });

  // Column Settings state
  const [columnSettings, setColumnSettings] = useState<ColumnSetting[]>([
    { key: 'period', label: 'Period (Created At)', visible: true },
    { key: 'submittedBy', label: 'Submitted By (Team Lead)', visible: true },
    { key: 'contains', label: 'Contains', visible: true },
    { key: 'status', label: 'Status', visible: true },
    { key: 'actions', label: 'Actions', visible: true },
  ]);

  const sortByOptions: SortByOption[] = useMemo(
    () => [
      { key: 'createdAt', value: 'createdAt', label: 'Created Date' },
      { key: 'teamLead', value: 'teamLead', label: 'Team Lead Name' },
      { key: 'status', value: 'status', label: 'Status' },
    ],
    []
  );

  // Dynamically build filter config (including team lead options)
  const filterConfig: FilterFieldConfig[] = useMemo(() => {
    const teamLeadOptions = Array.from(
      new Map(
        batches
          .filter((b) => b.teamLead != null)
          .map((b) => [
            b.teamLead?.ID,
            {
              value: String(b.teamLead?.ID),
              label: `${b.teamLead?.firstName} ${b.teamLead?.lastName}`,
            },
          ])
      ).values()
    );

    return BASE_FILTER_CONFIG.map((config) => {
      if (config.key === 'teamLead') {
        return { ...config, options: teamLeadOptions } as FilterFieldConfig;
      }
      return config as FilterFieldConfig;
    });
  }, [batches]);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      setIsLoading(true);
      const data = await fetchTimesheetBatches();
      setBatches(data);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to load batches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers ---
  const handleExportBatch = async (batchId: string) => {
    try {
      setIsExporting(true);
      const detail = await fetchTimesheetBatchById(batchId);
      await exportBatchToExcel(detail);
    } catch (error) {
      console.error('Failed to export batch:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredBatches = useMemo(() => {
    let result = batches.filter((b) => {
      if (appliedFilters.status) {
        const statuses = appliedFilters.status as string[];
        if (statuses.length > 0) {
          if (!statuses.includes(b.status)) {
            return false;
          }
        }
      }
      if (appliedFilters.teamLead) {
        const leads = appliedFilters.teamLead as string[];
        if (leads.length > 0) {
          if (!b.teamLead?.ID || !leads.includes(b.teamLead.ID)) {
            return false;
          }
        }
      }
      if (appliedFilters.search) {
        const search = (appliedFilters.search as string).toLowerCase();
        if (!b.ID.toLowerCase().includes(search)) {
          return false;
        }
      }
      // Date Range logic
      if (appliedFilters.createdAt) {
        const dateRange = appliedFilters.createdAt as DateRange;
        if (dateRange.from && dateRange.to && b.createdAt) {
          const batchDate = new Date(b.createdAt);
          if (
            !isWithinInterval(batchDate, {
              start: startOfDay(dateRange.from),
              end: endOfDay(dateRange.to),
            })
          ) {
            return false;
          }
        }
      }
      return true;
    });

    // Sort logic
    result = [...result].sort((a, b) => {
      let comparison = 0;
      if (currentSort.by === 'createdAt') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateA - dateB;
      } else if (currentSort.by === 'ID') {
        comparison = a.ID.localeCompare(b.ID);
      } else if (currentSort.by === 'teamLead') {
        const nameA = `${a.teamLead?.firstName || ''} ${a.teamLead?.lastName || ''}`;
        const nameB = `${b.teamLead?.firstName || ''} ${b.teamLead?.lastName || ''}`;
        comparison = nameA.localeCompare(nameB);
      } else if (currentSort.by === 'status') {
        comparison = a.status.localeCompare(b.status);
      }

      return currentSort.order === 'ascending' ? comparison : -comparison;
    });

    return result;
  }, [batches, appliedFilters, currentSort]);

  // --- Actions ---
  const toolbarActions: ActionItem[] = useMemo(
    () => [
      {
        id: 'showDetail',
        icon: FileText,
        group: 'primary',
        size: 'icon',
        onClick: () => {
          if (selectedIds.size === 1) {
            const id = Array.from(selectedIds)[0];
            navigate(`/admin/batches/${id}`);
          }
        },
        disabled: selectedIds.size !== 1,
        labelKey: 'Show Detail',
        title: 'Show Detail',
      },
      // Group: tools — icon-only utility buttons
      {
        id: 'export',
        icon: Download,
        group: 'tools',
        size: 'icon',
        onClick: () => {
          if (selectedIds.size === 1) {
            const id = Array.from(selectedIds)[0];
            handleExportBatch(id);
          }
        },
        disabled: selectedIds.size !== 1 || isExporting,
        labelKey: 'Export',
        title: 'Export to Excel',
      },
      {
        id: 'sort',
        icon: SlidersVertical,
        group: 'tools',
        size: 'icon',
        onClick: () => setIsSortOpen(true),
        labelKey: 'Sort',
        title: 'Sort Options',
      },
      {
        id: 'back-to-top',
        icon: ArrowUp,
        group: 'tools',
        size: 'icon',
        onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        labelKey: 'Back to Top',
        title: 'Back to Top',
      },
      {
        id: 'settings',
        icon: Settings,
        group: 'tools',
        size: 'icon',
        onClick: () => setIsColumnSettingsOpen(true),
        labelKey: 'Settings',
        title: 'Column Settings',
      },
      {
        id: 'refresh',
        icon: RefreshCw,
        group: 'actions',
        size: 'icon',
        onClick: loadBatches,
        variant: 'ghost',
        title: 'Refresh list',
      },
    ],
    [loadBatches, navigate, selectedIds]
  );

  // --- Columns ---
  const columns: DataTableColumn<TimesheetBatch>[] = useMemo(
    () => [
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
                <div className="text-foreground font-semibold">
                  {monthName} {year}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Created: {createdDate ? format(createdDate, 'MMM dd, yyyy') : 'No Date'}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'submittedBy',
        labelKey: 'Submitted By (Team Lead)',
        width: 250,
        render: (_, batch) => (
          <div className="flex items-center gap-3 py-1">
            <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex justify-center items-center text-xs font-semibold shrink-0">
              {batch.teamLead?.firstName?.[0]}
              {batch.teamLead?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {batch.teamLead?.firstName} {batch.teamLead?.lastName}
              </div>
              <div className="text-xs text-muted-foreground truncate">{batch.teamLead?.email}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'contains',
        labelKey: 'Contains',
        width: 140,
        render: (_, batch) => (
          <span className="inline-flex items-center justify-center bg-muted px-2.5 py-1 rounded-md text-xs font-medium border">
            {batch.timesheets?.length || 0} timesheets
          </span>
        ),
      },
      {
        key: 'status',
        labelKey: 'Status',
        width: 120,
        render: (_, batch) => {
          const cls = [
            'inline-block px-2 py-1 rounded-full text-xs font-medium border',
            batch.status === 'Pending'  ? 'bg-status-new text-status-new-text border-status-new-border'
            : batch.status === 'Done'  ? 'bg-status-completed text-status-completed-text border-status-completed-border'
            : batch.status === 'Sent'  ? 'bg-status-released text-status-released-text border-status-released-border'
            : 'bg-status-progress text-status-progress-text border-status-progress-border',
          ].join(' ');
          return <span className={cls}>{batch.status}</span>;
        },
      },
      {
        key: 'actions',
        labelKey: 'Actions',
        width: 150,
        visible: true,
        render: (_, batch) => {
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={isExporting}
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportBatch(batch.ID);
                }}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [navigate, isExporting]
  );

  const selectionConfig: SelectionConfig = useMemo(
    () => ({
      enabled: true,
      mode: 'multiple',
      selectedIds,
      onSelectionChange: setSelectedIds,
      getRowId: (row: TimesheetBatch) => row.ID,
    }),
    [selectedIds]
  );

  // Apply column visibility
  const visibleColumns = useMemo(() => {
    return columns.map((col) => {
      const setting = columnSettings.find((s) => s.key === col.key);
      return {
        ...col,
        visible: setting ? setting.visible : col.visible,
      };
    });
  }, [columns, columnSettings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Review and manage timesheet batches submitted by team leads</p>
      </div>

      {/* FilterBar */}
      <FilterBar
        config={filterConfig}
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
            Batches{' '}
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
          onRowClick={(row) => navigate(`/admin/batches/${row.ID}`)}
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
