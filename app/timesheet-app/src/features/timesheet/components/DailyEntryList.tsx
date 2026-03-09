import { useMemo, useState, useCallback } from 'react';
import { format, isToday, isYesterday, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { Copy, Plus, Trash, Pencil, Trash2, Search, Folder, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import type { CheckedState } from '@radix-ui/react-checkbox';
import type { TimesheetEntry, Project, Task } from '@/shared/types';

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

interface DailyEntryListProps {
  currentMonth: Date;
  entries: TimesheetEntry[];
  projects: Project[];
  tasks?: Task[];
  selectedEntryIds: Set<string>;
  onAddEntry: (date: string) => void;
  onDuplicateDay?: (date: string) => void;
  onEditEntry: (entry: TimesheetEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onSelectEntry: (entryId: string, checked: boolean) => void;
  onSelectAllForDay: (date: string, checked: boolean) => void;
  onDeleteSelectedForDay: (date: string) => void;
  onUpdateEntry?: (
    entryId: string,
    changes: Partial<Pick<TimesheetEntry, 'projectId' | 'taskId' | 'description'>>
  ) => void;
  readOnly?: boolean;
}

// ═══════════════════════════════════════════════════
// ValueHelp trigger field (cnma_prosourcing pattern)
// ═══════════════════════════════════════════════════

const TYPE_COLOR: Record<string, string> = {
  Papierkram: 'bg-status-sent text-status-sent-text',
  Internal: 'bg-status-released text-status-released-text',
  External: 'bg-status-completed text-status-completed-text',
  Other: 'bg-status-obsoleted text-status-obsoleted-text',
};

// ═══════════════════════════════════════════════════
// Project ValueHelp Dialog
// ═══════════════════════════════════════════════════

interface ProjectDialogProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  selectedId: string;
  onSelect: (projectId: string) => void;
}

function ProjectValueHelpDialog({ open, onClose, projects, selectedId, onSelect }: ProjectDialogProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }, [projects, search]);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      onClose();
      setSearch('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-[95vw] w-[95vw] sm:max-w-[600px] sm:w-[600px] h-[75vh] flex flex-col p-0 gap-0"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg">Select Project</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search by name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <p className="text-sm font-semibold text-foreground mt-2">Projects ({filtered.length})</p>
        </div>

        {/* List */}
        <div className="flex-1 relative px-6 pb-2">
          <div className="absolute inset-0 overflow-auto px-6 pb-2 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {projects.length === 0 ? 'No projects available.' : 'No projects match your search.'}
              </div>
            ) : (
              filtered.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={[
                    'w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
                    'hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selectedId === project.id ? 'bg-primary/10 ring-1 ring-primary/30' : '',
                  ].join(' ')}
                  onClick={() => {
                    onSelect(project.id);
                    setSearch('');
                    onClose();
                  }}
                >
                  <div
                    className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${TYPE_COLOR[project.type] ?? TYPE_COLOR['Other']}`}
                  >
                    <Folder className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{project.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {project.code} · {project.type}
                    </div>
                  </div>
                  {selectedId === project.id && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════
// Task ValueHelp Dialog
// ═══════════════════════════════════════════════════

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  selectedId: string;
  onSelect: (taskId: string) => void;
}

function TaskValueHelpDialog({ open, onClose, tasks, selectedId, onSelect }: TaskDialogProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter((t) => t.name.toLowerCase().includes(q));
  }, [tasks, search]);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      onClose();
      setSearch('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-[95vw] w-[95vw] sm:max-w-[500px] sm:w-[500px] h-[65vh] flex flex-col p-0 gap-0"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg">Select Task</DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <p className="text-sm font-semibold text-foreground mt-2">Tasks ({filtered.length})</p>
        </div>

        <div className="flex-1 relative px-6 pb-2">
          <div className="absolute inset-0 overflow-auto px-6 pb-2 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {tasks.length === 0 ? 'No tasks available for this project.' : 'No tasks match your search.'}
              </div>
            ) : (
              filtered.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={[
                    'w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
                    'hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selectedId === task.id ? 'bg-primary/10 ring-1 ring-primary/30' : '',
                  ].join(' ')}
                  onClick={() => {
                    onSelect(task.id);
                    setSearch('');
                    onClose();
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{task.name}</div>
                    {task.description && (
                      <div className="text-xs text-muted-foreground truncate">{task.description}</div>
                    )}
                  </div>
                  {selectedId === task.id && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════
// ValueHelp trigger button (cnma_prosourcing pattern)
// ═══════════════════════════════════════════════════

interface ValueHelpTriggerProps {
  value: string;
  placeholder: string;
  disabled?: boolean;
  onOpen: () => void;
  onClear?: () => void;
}

function ValueHelpTrigger({ value, placeholder, disabled, onOpen, onClear }: ValueHelpTriggerProps) {
  return (
    <div className="relative group w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        className={[
          'w-full h-9 flex items-center gap-2 rounded-md border px-3 text-sm text-left transition-colors',
          disabled
            ? 'bg-muted/40 border-input text-muted-foreground cursor-default'
            : 'bg-background border-input hover:bg-muted/50 cursor-pointer',
        ].join(' ')}
      >
        <span className="flex-1 truncate">{value || <span className="text-muted-foreground">{placeholder}</span>}</span>
        {!disabled && value && onClear && (
          <X
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          />
        )}
        {!disabled && (
          <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════

export function DailyEntryList({
  currentMonth,
  entries,
  projects,
  tasks = [],
  selectedEntryIds,
  onAddEntry,
  onDuplicateDay,
  onEditEntry,
  onDeleteEntry,
  onSelectEntry,
  onSelectAllForDay,
  onDeleteSelectedForDay,
  onUpdateEntry,
  readOnly = false,
}: DailyEntryListProps) {
  // Track which dialog is open: { entryId, type }
  const [openDialog, setOpenDialog] = useState<{ entryId: string; type: 'project' | 'task' } | null>(null);

  const allDaysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    // Ascending order: day 1 → last day
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const groupedEntries = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        if (!acc[entry.date]) acc[entry.date] = [];
        acc[entry.date].push(entry);
        return acc;
      },
      {} as Record<string, TimesheetEntry[]>
    );
  }, [entries]);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'TODAY';
    if (isYesterday(date)) return 'YESTERDAY';
    if (isWeekend(date)) return 'WEEKEND';
    return format(date, 'EEEE').toUpperCase();
  };

  const getDailyTotal = (dateStr: string) => {
    return (groupedEntries[dateStr] || []).reduce((sum, e) => sum + e.hours, 0).toFixed(2);
  };

  const getTasksForProject = useCallback(
    (projectId: string) =>
      tasks.filter((t) => t.projectId === projectId && (t.status === 'Open' || t.status === 'InProgress')),
    [tasks]
  );

  const areAllDayEntriesSelected = (dateStr: string) => {
    const dayEntries = groupedEntries[dateStr] || [];
    return dayEntries.length > 0 && dayEntries.every((e) => selectedEntryIds.has(e.id));
  };

  const areSomeDayEntriesSelected = (dateStr: string) => {
    const dayEntries = groupedEntries[dateStr] || [];
    const count = dayEntries.filter((e) => selectedEntryIds.has(e.id)).length;
    return count > 0 && count < dayEntries.length;
  };

  // Find active dialog entry
  const dialogEntry = openDialog ? entries.find((e) => e.id === openDialog.entryId) : null;
  const dialogProjectTasks = dialogEntry ? getTasksForProject(dialogEntry.projectId) : [];

  return (
    <>
      <div className="space-y-1">
        {allDaysInMonth.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEntries = groupedEntries[dateStr] || [];
          const dailyTotal = getDailyTotal(dateStr);
          const dailyTotalNum = parseFloat(dailyTotal);
          const dateLabel = getDateLabel(day);
          const isWeekendDay = isWeekend(day);
          const allSelected = areAllDayEntriesSelected(dateStr);
          const someSelected = areSomeDayEntriesSelected(dateStr);

          // Warn when a weekday has entries logged but total != 8h
          const hasHourWarning =
            !isWeekendDay && dayEntries.length > 0 && dailyTotalNum !== 8;
          const isOvertime = hasHourWarning && dailyTotalNum > 8;
          const hourWarningMsg = hasHourWarning
            ? isOvertime
              ? `+${(dailyTotalNum - 8).toFixed(2)}h over — extra time counts as OT`
              : `-${(8 - dailyTotalNum).toFixed(2)}h short — add more hours to reach 8h`
            : null;

          return (
            <Card
              key={dateStr}
              className={`border-0 shadow-sm ${
                hasHourWarning
                  ? isOvertime
                    ? 'border-l-2 border-l-warning bg-warning-bg/40'
                    : 'border-l-2 border-l-error bg-error-bg/40'
                  : isWeekendDay
                    ? 'border-l-2 border-l-status-new bg-status-new'
                    : ''
              }`}
            >
              <CardContent className="p-0">
                {/* Date Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-border/50">
                  <div>
                    <div className="text-sm font-semibold">{format(day, 'MMM dd, EEE')}</div>
                    <div
                      className={`text-[11px] font-semibold ${isToday(day) ? 'text-info' : isWeekendDay ? '' : 'text-info'}`}
                    >
                      {dateLabel}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className={`text-lg font-bold min-w-[60px] text-right ${
                        hasHourWarning
                          ? isOvertime
                            ? 'text-warning'
                            : 'text-error'
                          : 'text-info'
                      }`}
                    >
                      {dailyTotal}
                    </div>
                    {!readOnly && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => onDeleteSelectedForDay(dateStr)}
                          title="Delete selected entries"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => onDuplicateDay?.(dateStr)}
                          title="Duplicate day"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
                          onClick={() => onAddEntry(dateStr)}
                          title="Add entry"
                        >
                          <Plus className="h-4 w-4 text-white" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Hour warning banner */}
                {hourWarningMsg && (
                  <div
                    className={`flex items-center gap-2 px-6 py-1.5 text-xs font-medium border-b border-border/40 ${
                      isOvertime
                        ? 'bg-warning-bg text-warning'
                        : 'bg-error-bg text-error'
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{hourWarningMsg}</span>
                  </div>
                )}

                {/* Entry Rows */}
                {dayEntries.length > 0 ? (
                  <div className="divide-y divide-border/30">
                    {/* Column headers */}
                    <div className="grid grid-cols-12 gap-4 items-center px-6 py-2 bg-muted/30">
                      <div className="col-span-2 min-w-0 flex items-center gap-2">
                        {!readOnly && (
                          <Checkbox
                            id={`select-all-${dateStr}`}
                            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                            onCheckedChange={(checked: CheckedState) => onSelectAllForDay(dateStr, !!checked)}
                          />
                        )}
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Select
                        </span>
                      </div>
                      <div className="col-span-2 min-w-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Project
                      </div>
                      <div className="col-span-2 min-w-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Task
                      </div>
                      <div className="col-span-3 min-w-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Description
                      </div>
                      <div className="col-span-1 min-w-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
                        HRS
                      </div>
                      <div className="col-span-2 min-w-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
                        Action
                      </div>
                    </div>

                    {dayEntries.map((entry) => {
                      const projectName = projects.find((p) => p.id === entry.projectId)?.name ?? 'Unknown';
                      const projectTasks = getTasksForProject(entry.projectId);
                      const taskName = tasks.find((t) => t.id === entry.taskId)?.name;

                      return (
                        <div key={entry.id} className="grid grid-cols-12 gap-4 items-center px-6 py-3">
                          {/* Checkbox */}
                          <div className="col-span-2 min-w-0 flex items-center gap-2">
                            {!readOnly && (
                              <Checkbox
                                id={`entry-${entry.id}`}
                                checked={selectedEntryIds.has(entry.id)}
                                onCheckedChange={(checked: CheckedState) => onSelectEntry(entry.id, !!checked)}
                              />
                            )}
                          </div>

                          {/* Project – ValueHelp trigger */}
                          <div className="col-span-2 min-w-0">
                            <ValueHelpTrigger
                              value={projectName !== 'Unknown' ? projectName : ''}
                              placeholder="Select project"
                              disabled={readOnly}
                              onOpen={() => setOpenDialog({ entryId: entry.id, type: 'project' })}
                              onClear={() => onUpdateEntry?.(entry.id, { projectId: '', taskId: '' })}
                            />
                          </div>

                          {/* Task – ValueHelp trigger */}
                          <div className="col-span-2 min-w-0">
                            <ValueHelpTrigger
                              value={taskName ?? ''}
                              placeholder={
                                entry.projectId ? (projectTasks.length > 0 ? 'Select task' : 'No tasks') : '—'
                              }
                              disabled={readOnly || !entry.projectId || projectTasks.length === 0}
                              onOpen={() => setOpenDialog({ entryId: entry.id, type: 'task' })}
                              onClear={() => onUpdateEntry?.(entry.id, { taskId: '' })}
                            />
                          </div>

                          {/* Description – Textarea inline */}
                          <div className="col-span-3 min-w-0">
                            <Textarea
                              value={entry.description || ''}
                              placeholder="Description…"
                              rows={1}
                              readOnly={readOnly}
                              disabled={readOnly}
                              className="text-sm resize-none min-h-[36px] py-2"
                              onChange={(e) => onUpdateEntry?.(entry.id, { description: e.target.value })}
                              onBlur={(e) => onUpdateEntry?.(entry.id, { description: e.target.value })}
                            />
                          </div>

                          {/* Hours */}
                          <div className="col-span-1 min-w-0 text-right">
                            <div className="text-sm font-semibold">{entry.hours.toFixed(2)}</div>
                          </div>

                          {/* Actions */}
                          <div className="col-span-2 min-w-0 flex justify-end gap-1">
                            {!readOnly && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                                  onClick={() => onEditEntry(entry)}
                                  title="Edit entry"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => onDeleteEntry(entry.id)}
                                  title="Delete entry"
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-sm text-muted-foreground">No activities logged</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Project ValueHelp Dialog */}
      {openDialog?.type === 'project' && dialogEntry && (
        <ProjectValueHelpDialog
          open={true}
          onClose={() => setOpenDialog(null)}
          projects={projects}
          selectedId={dialogEntry.projectId}
          onSelect={(projectId) => {
            onUpdateEntry?.(dialogEntry.id, { projectId, taskId: '' });
          }}
        />
      )}

      {/* Task ValueHelp Dialog */}
      {openDialog?.type === 'task' && dialogEntry && (
        <TaskValueHelpDialog
          open={true}
          onClose={() => setOpenDialog(null)}
          tasks={dialogProjectTasks}
          selectedId={dialogEntry.taskId ?? ''}
          onSelect={(taskId) => {
            onUpdateEntry?.(dialogEntry.id, { taskId });
          }}
        />
      )}
    </>
  );
}
