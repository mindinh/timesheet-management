import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash,
  ListTodo,
  ChevronRight,
  SlidersVertical,
  ArrowUp,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { TableActionBar } from '@/shared/components/common/TableActionBar';
import {
  SortDialog,
  type SortOption,
  type SortByOption,
  ColumnSettingsDialog,
  type ColumnSetting,
} from '@/shared/components/dialogs';
import type { ActionItem } from '@/types/component-config.types';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { DataTable } from '@/shared/components/common/DataTable';
import type { DataTableColumn, SelectionConfig } from '@/shared/components/common/DataTable';
import { FilterBar } from '@/shared/components/filterbar/FilterBar';
import type { FilterFieldConfig, FilterValues } from '@/shared/components/filterbar/types';
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore';
import { useProjectStore } from '@/features/projects/store/projectStore';
import { ProjectTasksPanel } from '@/features/projects/components/ProjectTasksPanel';
import { useSidebarStore } from '@/shared/store/sidebarStore';
import type { Project, ProjectType } from '@/shared/types';
import StatusDialog from '@/shared/components/common/StatusDialog';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import { useTranslation } from 'react-i18next';

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'Papierkram', label: 'Papierkram' },
  { value: 'Internal', label: 'Internal' },
  { value: 'External', label: 'External' },
  { value: 'Other', label: 'Others' },
];

const TYPE_COLORS: Record<ProjectType, string> = {
  Papierkram: 'bg-warning-bg text-warning',
  Internal: 'bg-info-bg text-info',
  External: 'bg-primary/10 text-primary',
  Other: 'bg-muted text-muted-foreground',
};

// ── Filter Configuration ────────────────────────────────────────────
const FILTER_CONFIG: FilterFieldConfig[] = [
  {
    key: 'search',
    type: 'text',
    label: 'Search',
    labelKey: 'common.search',
    placeholder: 'Search by name or code...',
  },
  {
    key: 'type',
    type: 'multiselect',
    label: 'Type',
    labelKey: 'projects.table.type',
    placeholder: 'All Types',
    options: PROJECT_TYPES.map((pt) => ({ value: pt.value, label: pt.label })),
  },
  {
    key: 'status',
    type: 'multiselect',
    label: 'Status',
    labelKey: 'projects.table.status',
    placeholder: 'All Statuses',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
];

const DEFAULT_FILTER_VALUES: FilterValues = {
  search: '',
  type: [],
  status: [],
};

const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 600;
const DEFAULT_PANEL_WIDTH = 360;

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { currentUser } = useTimesheetStore();
  const { projects, tasks, isLoading, fetchProjects, addProject, updateProject, deleteProject } = useProjectStore();
  const { isCollapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useSidebarStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [filterValues, setFilterValues] = useState<FilterValues>(DEFAULT_FILTER_VALUES);
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(DEFAULT_FILTER_VALUES);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    type: 'Other' as ProjectType,
    isActive: true,
  });

  // Checkbox selection (independent of viewing — only managed by checkboxes)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Track whether we collapsed the sidebar ourselves
  const prevSidebarCollapsed = useRef(sidebarCollapsed);

  // Resize refs
  const isResizing = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(DEFAULT_PANEL_WIDTH);

  // Dialogs
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    variant: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
  }>({
    open: false,
    variant: 'info',
    title: '',
  });
  const [confirmDialogState, setConfirmDialogState] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    onConfirm: () => {},
  });

  // Toolbar dialogs
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [currentSort, setCurrentSort] = useState<SortOption>({ by: 'name', order: 'ascending' });
  const [columnSettings, setColumnSettings] = useState<ColumnSetting[]>([
    { key: 'code', label: 'Code', visible: true },
    { key: 'name', label: 'Name', visible: true },
    { key: 'type', label: 'Type', visible: true },
    { key: 'taskCount', label: 'Tasks', visible: true },
    { key: 'isActive', label: 'Status', visible: true },
    { key: 'actions', label: 'Actions', visible: true },
  ]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ── Resize handlers ─────────────────────────────────────────────
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = panelWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizing.current) return;
        const diff = resizeStartX.current - moveEvent.clientX;
        const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, resizeStartWidth.current + diff));
        setPanelWidth(newWidth);
      };

      const handleMouseUp = () => {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [panelWidth]
  );

  // ── Row click → open/close task panel (does NOT affect checkboxes) ──
  const handleRowClick = (project: Project) => {
    if (selectedProjectId === project.id) {
      // Same project clicked → close panel and deselect
      handleClosePanel();
      return;
    }
    // New project selected → open panel
    if (!sidebarCollapsed) {
      prevSidebarCollapsed.current = false;
      setSidebarCollapsed(true);
    }
    setSelectedProjectId(project.id);
  };

  const handleClosePanel = () => {
    setSelectedProjectId(null);
    if (!prevSidebarCollapsed.current) {
      setSidebarCollapsed(false);
    }
  };

  // ── Filter Logic (client-side) ──────────────────────────────────
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Text search
      const search = ((appliedFilters.search as string) || '').toLowerCase();
      if (search && !p.name.toLowerCase().includes(search) && !p.code.toLowerCase().includes(search)) {
        return false;
      }
      // Type multi-filter (empty = show all)
      const typeFilter = appliedFilters.type as string[];
      if (typeFilter && typeFilter.length > 0 && !typeFilter.includes(p.type as string)) {
        return false;
      }
      // Status multi-filter (empty = show all)
      const statusFilter = appliedFilters.status as string[];
      if (statusFilter && statusFilter.length > 0) {
        const isActive = p.isActive ? 'active' : 'inactive';
        if (!statusFilter.includes(isActive)) return false;
      }
      return true;
    });
  }, [projects, appliedFilters]);

  // ── Selection config — checkboxes only, does NOT include active project ──
  const selectionConfig: SelectionConfig = useMemo(
    () => ({
      enabled: true,
      mode: 'multiple' as const,
      selectedIds: checkedIds,
      onSelectionChange: setCheckedIds,
      getRowId: (row: Project) => row.id,
    }),
    [checkedIds]
  );

  // ── CRUD Handlers ───────────────────────────────────────────────
  const handleCreate = () => {
    setEditingProject(undefined);
    setFormData({ name: '', code: '', description: '', type: 'Other', isActive: true });
    setIsDialogOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description || '',
      type: project.type || 'Other',
      isActive: project.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDialogState({
      open: true,
      title: t('projects.delete'),
      description: 'Are you sure you want to delete this project?',
      onConfirm: async () => {
        try {
          await deleteProject(id);
          if (selectedProjectId === id) handleClosePanel();
        } catch {
          setStatusDialog({
            open: true,
            variant: 'error',
            title: 'Delete Failed',
            description: 'Failed to delete project.',
          });
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData);
      } else {
        await addProject(formData);
      }
      setIsDialogOpen(false);
    } catch {
      setStatusDialog({ open: true, variant: 'error', title: 'Save Failed', description: 'Failed to save project.' });
    }
  };

  const getTaskCount = (projectId: string) => (tasks[projectId] || []).length;

  // Map internal type value to display label
  const displayType = (type?: ProjectType) => {
    const match = PROJECT_TYPES.find((pt) => pt.value === type);
    return match?.label || 'Others';
  };

  const sortByOptions: SortByOption[] = useMemo(
    () => [
      { key: 'name', value: 'name', label: 'Name' },
      { key: 'code', value: 'code', label: 'Code' },
      { key: 'type', value: 'type', label: 'Type' },
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
        onClick: () => fetchProjects(),
        title: 'Refresh',
      },
    ],
    [fetchProjects]
  );

  // ── Column Definitions ──────────────────────────────────────────
  const columns: DataTableColumn<Project>[] = useMemo(
    () => [
      {
        key: 'code',
        labelKey: 'projects.table.id',
        width: 100,
        minWidth: 80,
        render: (_value: string, row: Project) => (
          <div className="flex items-center gap-2">
            {/* Active-project indicator bar */}
            {selectedProjectId === row.id && <div className="w-1 h-6 rounded-full bg-primary shrink-0" />}
            <span className="text-xs text-muted-foreground">#{row.code}</span>
          </div>
        ),
      },
      {
        key: 'name',
        labelKey: 'projects.table.name',
        width: 300,
        minWidth: 180,
        render: (_value: string, row: Project) => (
          <div className="min-w-0">
            <div className="font-medium truncate">{row.name}</div>
            {row.description && <div className="text-xs text-muted-foreground mt-0.5 truncate">{row.description}</div>}
          </div>
        ),
      },
      {
        key: 'type',
        labelKey: 'projects.table.type',
        width: 120,
        minWidth: 100,
        render: (_value: string, row: Project) => (
          <Badge variant="secondary" className={`text-xs ${TYPE_COLORS[row.type || 'Other']}`}>
            {displayType(row.type)}
          </Badge>
        ),
      },
      {
        key: 'taskCount',
        labelKey: 'projects.table.tasks',
        width: 120,
        minWidth: 100,
        render: (_value: unknown, row: Project) => {
          const count = getTaskCount(row.id);
          return (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ListTodo className="h-3.5 w-3.5" />
              {count > 0 ? (
                <span>
                  {count} task{count !== 1 ? 's' : ''}
                </span>
              ) : (
                <span>No tasks</span>
              )}
            </div>
          );
        },
      },
      {
        key: 'isActive',
        labelKey: 'projects.table.status',
        width: 100,
        minWidth: 80,
        render: (_value: boolean, row: Project) => (
          <Badge
            variant="secondary"
            className={
              row.isActive ? 'bg-status-completed text-status-completed-text' : 'bg-muted text-muted-foreground'
            }
          >
            {row.isActive ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        labelKey: 'projects.table.actions',
        width: 100,
        minWidth: 80,
        render: (_value: unknown, row: Project) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => handleEdit(e, row)}
              title={t('projects.edit')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => handleDelete(e, row.id)}
              title={t('projects.delete')}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [tasks, t, selectedProjectId]
  );

  const selectedProject = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) : null;

  const showPanel = selectedProject !== null;

  return (
    <>
      <div className="flex -m-6 overflow-hidden" style={{ height: 'calc(100% + 48px)' }}>
        {/* ── Left: Table Area ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t('projects.description')}</p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {t('projects.create')}
              </Button>
            </div>

            {/* Filter Bar — expanded by default */}
            <FilterBar
              config={FILTER_CONFIG}
              values={filterValues}
              onChange={setFilterValues}
              onApply={setAppliedFilters}
              isLoading={isLoading}
              defaultExpanded={true}
            />

            {/* Table Card — wraps toolbar + table like Timesheets page */}
            <div className="bg-card border-0 shadow-sm rounded-xl overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold">
                  {t('projects.title')} <span className="text-primary">({filteredProjects.length})</span>
                </h2>
                <TableActionBar actions={toolbarActions} align="right" />
              </div>

              {/* Table (borderless, no extra border/radius inside parent card) */}
              <DataTable<Project>
                data={filteredProjects}
                columns={columns}
                isLoading={isLoading}
                onRowClick={handleRowClick}
                selection={selectionConfig}
                emptyMessageKey="projects.noProjects"
                showFooter={false}
                variant="borderless"
                className="border-0 rounded-none"
              />
            </div>
          </div>
        </div>

        {/* ── Right: Task Panel (full-height, resizable) ──────── */}
        {showPanel && (
          <div
            className="relative shrink-0 flex flex-col bg-card border-l border-border overflow-visible"
            style={{ width: panelWidth }}
          >
            {/* Resize drag handle */}
            <div
              className="absolute inset-y-0 left-0 w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 z-20 transition-colors"
              onMouseDown={handleResizeStart}
            />

            {/* Collapse circle button — vertically centered, symmetric with sidebar */}
            <button
              onClick={handleClosePanel}
              className="absolute top-1/2 -translate-y-1/2 -left-3 z-30 flex h-6 w-6 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-accent transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {/* Panel Header — h-16 for symmetric horizontal line with sidebar */}
            <div className="shrink-0 h-16 border-b border-border px-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold truncate">{selectedProject?.name}</h2>
                <span className="text-xs text-muted-foreground">#{selectedProject?.code}</span>
              </div>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-4">
              <ProjectTasksPanel projectId={selectedProject!.id} onClose={handleClosePanel} />
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? t('projects.edit') : t('projects.create')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cloud Migration"
                  required
                />
              </div>
              <div>
                <Label htmlFor="code">Project Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. P001"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional project description"
              />
            </div>
            <div>
              <Label htmlFor="type">Project Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val as ProjectType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">{editingProject ? 'Update' : 'Create'}</Button>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <StatusDialog
        open={statusDialog.open}
        onOpenChange={(open) => setStatusDialog((prev) => ({ ...prev, open }))}
        variant={statusDialog.variant}
        title={statusDialog.title}
        description={statusDialog.description}
      />
      <ConfirmDialog
        open={confirmDialogState.open}
        onOpenChange={(open) => setConfirmDialogState((prev) => ({ ...prev, open }))}
        title={confirmDialogState.title}
        description={confirmDialogState.description}
        onConfirm={confirmDialogState.onConfirm}
      />

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
    </>
  );
}
