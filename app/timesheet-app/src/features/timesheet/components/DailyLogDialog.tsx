import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Folder, Plus, Search, X } from 'lucide-react';
import type { TimesheetEntry, ProjectType } from '@/shared/types';
import { useProjectStore } from '@/features/projects/store/projectStore';
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore';

// ═══════════════════════════════════════════════════
// Schema
// ═══════════════════════════════════════════════════

const formSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  taskId: z.string().optional(),
  hours: z.coerce
    .number()
    .min(0.1, 'Minimum 0.1 hours')
    .max(24, 'Maximum 24 hours')
    .refine((val) => val % 0.5 === 0, 'Hours must be in 0.5 increments'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'Papierkram', label: 'Papierkram' },
  { value: 'Internal', label: 'Internal' },
  { value: 'External', label: 'External' },
  { value: 'Other', label: 'Other' },
];

const TYPE_COLOR: Record<string, string> = {
  Papierkram: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Internal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  External: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

// ═══════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════

interface DailyLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  onSubmit: (data: FormData) => void;
  entry?: TimesheetEntry;
}

// ═══════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════

export function DailyLogDialog({ open, onOpenChange, date, onSubmit, entry }: DailyLogDialogProps) {
  const { projects, fetchProjects, tasks, fetchTasks, addProject, addTask } = useProjectStore();
  const { currentUser } = useTimesheetStore();

  // Project picker panel (inline, not a nested dialog)
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');

  // Task picker panel
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');

  // Inline creation panels
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [newProject, setNewProject] = useState({ name: '', code: '', type: 'Other' as ProjectType });
  const [newTask, setNewTask] = useState({ name: '', description: '' });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: { projectId: '', taskId: '', hours: 8, description: '' },
  });

  const selectedProjectId = form.watch('projectId');
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (open && projects.length === 0) {
      fetchProjects();
    }
  }, [open, projects.length, fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) fetchTasks(selectedProjectId);
  }, [selectedProjectId, fetchTasks]);

  useEffect(() => {
    if (open) {
      if (entry) {
        form.reset({
          projectId: entry.projectId,
          taskId: entry.taskId || '',
          hours: entry.hours,
          description: entry.description || '',
        });
      } else {
        form.reset({ projectId: '', taskId: '', hours: 8, description: '' });
      }
      setShowProjectPicker(false);
      setShowTaskPicker(false);
      setShowCreateProject(false);
      setShowCreateTask(false);
      setProjectSearch('');
      setTaskSearch('');
    }
  }, [open, entry, form]);

  // ── Computed ─────────────────────────────────────────────────────────────

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }, [projects, projectSearch]);

  const availableTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return (tasks[selectedProjectId] || []).filter((t) => t.status === 'Open' || t.status === 'InProgress');
  }, [selectedProjectId, tasks]);

  const filteredTasks = useMemo(() => {
    if (!taskSearch.trim()) return availableTasks;
    const q = taskSearch.toLowerCase();
    return availableTasks.filter((t) => t.name.toLowerCase().includes(q));
  }, [availableTasks, taskSearch]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSubmit = (data: FormData) => {
    onSubmit({ ...data, taskId: data.taskId || undefined });
    form.reset();
    onOpenChange(false);
  };

  const handlePickProject = (projectId: string) => {
    form.setValue('projectId', projectId, { shouldValidate: true });
    form.setValue('taskId', '');
    setShowProjectPicker(false);
    setProjectSearch('');
    setShowTaskPicker(false);
    setTaskSearch('');
  };

  const handlePickTask = (taskId: string) => {
    form.setValue('taskId', taskId, { shouldValidate: true });
    setShowTaskPicker(false);
    setTaskSearch('');
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim() || !newProject.code.trim() || !currentUser?.id) return;
    setIsCreating(true);
    try {
      const created = await addProject({
        name: newProject.name.trim(),
        code: newProject.code.trim(),
        type: newProject.type,
        isActive: true,
      });
      if (created) {
        form.setValue('projectId', created.id);
        form.setValue('taskId', '');
      }
      setNewProject({ name: '', code: '', type: 'Other' });
      setShowCreateProject(false);
    } catch {
      // logged in store
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.name.trim() || !selectedProjectId) return;
    setIsCreating(true);
    try {
      const created = await addTask({
        projectId: selectedProjectId,
        name: newTask.name.trim(),
        description: newTask.description.trim(),
        status: 'InProgress',
      });
      if (created) form.setValue('taskId', created.id);
      setNewTask({ name: '', description: '' });
      setShowCreateTask(false);
    } catch {
      // logged in store
    } finally {
      setIsCreating(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ── BidderQuotation-style: wide, flex-col, full-height ── */}
      <DialogContent
        aria-describedby={undefined}
        className="max-w-[95vw] w-[95vw] sm:max-w-[520px] sm:w-[520px] h-[90vh] max-h-[700px] flex flex-col p-0 gap-0"
      >
        {/* ── Header – border-b, px-6, pt-6 pb-4 ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg">
            {entry ? 'Edit Entry' : 'Log Time'} — {format(date, 'MMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>

        {/* ── Scrollable content area ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id="daily-log-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              {/* ── Project Field ── */}
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        Project <span className="text-destructive">*</span>
                      </FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-primary hover:text-primary/80 gap-1"
                        onClick={() => setShowCreateProject(!showCreateProject)}
                      >
                        <Plus className="h-3 w-3" />
                        New
                      </Button>
                    </div>

                    {/* Inline Create Project */}
                    {showCreateProject && (
                      <div className="p-3 border rounded-lg bg-muted/30 space-y-3 mb-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="min-w-0">
                            <Label htmlFor="newProjectName" className="text-xs">
                              Name
                            </Label>
                            <Input
                              id="newProjectName"
                              value={newProject.name}
                              onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))}
                              placeholder="e.g. Cloud Migration"
                              className="h-8 text-sm w-full"
                              autoFocus
                            />
                          </div>
                          <div className="min-w-0">
                            <Label htmlFor="newProjectCode" className="text-xs">
                              Code
                            </Label>
                            <Input
                              id="newProjectCode"
                              value={newProject.code}
                              onChange={(e) => setNewProject((p) => ({ ...p, code: e.target.value }))}
                              placeholder="e.g. P001"
                              className="h-8 text-sm w-full"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={newProject.type}
                            onValueChange={(v) => setNewProject((p) => ({ ...p, type: v as ProjectType }))}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
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
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCreateProject}
                            disabled={!newProject.name.trim() || !newProject.code.trim() || isCreating}
                          >
                            {isCreating ? 'Creating…' : 'Create'}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateProject(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Project trigger button */}
                    <FormControl>
                      <div
                        className={[
                          'flex items-center gap-2 h-10 w-full rounded-md border px-3 py-2 text-sm cursor-pointer',
                          'bg-background hover:bg-muted/50 transition-colors select-none',
                          form.formState.errors.projectId ? 'border-destructive' : 'border-input',
                          !selectedProject ? 'text-muted-foreground' : '',
                        ].join(' ')}
                        role="button"
                        tabIndex={0}
                        onClick={() => setShowProjectPicker((v) => !v)}
                        onKeyDown={(e) => e.key === 'Enter' && setShowProjectPicker((v) => !v)}
                      >
                        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">
                          {selectedProject ? (
                            <>
                              <span className="font-medium text-foreground">{selectedProject.name}</span>
                              <span className="text-muted-foreground text-xs ml-1">({selectedProject.code})</span>
                            </>
                          ) : (
                            'Select Project'
                          )}
                        </span>
                        {selectedProject ? (
                          <X
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              field.onChange('');
                              form.setValue('taskId', '');
                              setShowProjectPicker(false);
                            }}
                          />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />

                    {/* ── Inline Project Picker (BidderQuotation-style inline panel) ── */}
                    {showProjectPicker && (
                      <div className="border rounded-lg bg-background shadow-md overflow-hidden mt-1">
                        {/* Search */}
                        <div className="px-3 pt-3 pb-2 border-b border-border">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              autoFocus
                              placeholder="Search by name or code…"
                              value={projectSearch}
                              onChange={(e) => setProjectSearch(e.target.value)}
                              className="pl-9 h-9"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                            Projects ({filteredProjects.length})
                          </p>
                        </div>

                        {/* Project list */}
                        <div className="max-h-[220px] overflow-y-auto px-2 py-1.5 space-y-0.5">
                          {filteredProjects.length === 0 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                              {projects.length === 0
                                ? 'No projects yet. Create one with"+ New".'
                                : 'No projects match your search.'}
                            </div>
                          ) : (
                            filteredProjects.map((project) => (
                              <button
                                key={project.id}
                                type="button"
                                className={[
                                  'w-full flex items-center gap-3 rounded-md px-2 py-2 text-left transition-colors',
                                  'hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                  selectedProjectId === project.id ? 'bg-primary/10 ring-1 ring-primary/30' : '',
                                ].join(' ')}
                                onClick={() => handlePickProject(project.id)}
                              >
                                <div
                                  className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${TYPE_COLOR[project.type] ?? TYPE_COLOR['Other']}`}
                                >
                                  <Folder className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{project.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {project.code} · {project.type}
                                  </div>
                                </div>
                                {selectedProjectId === project.id && (
                                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* ── Task Field ── */}
              {selectedProjectId && !showProjectPicker && (
                <FormField
                  control={form.control}
                  name="taskId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Task</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-primary hover:text-primary/80 gap-1"
                          onClick={() => setShowCreateTask(!showCreateTask)}
                        >
                          <Plus className="h-3 w-3" />
                          New
                        </Button>
                      </div>

                      {showCreateTask && (
                        <div className="p-3 border rounded-lg bg-muted/30 space-y-3 mb-2">
                          <div className="min-w-0">
                            <Label htmlFor="newTaskName" className="text-xs">
                              Task Name
                            </Label>
                            <Input
                              id="newTaskName"
                              value={newTask.name}
                              onChange={(e) => setNewTask((t) => ({ ...t, name: e.target.value }))}
                              placeholder="e.g. Development"
                              className="h-8 text-sm w-full"
                              autoFocus
                            />
                          </div>
                          <div className="min-w-0">
                            <Label htmlFor="newTaskDesc" className="text-xs">
                              Description
                            </Label>
                            <Input
                              id="newTaskDesc"
                              value={newTask.description}
                              onChange={(e) => setNewTask((t) => ({ ...t, description: e.target.value }))}
                              placeholder="Optional description"
                              className="h-8 text-sm w-full"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleCreateTask}
                              disabled={!newTask.name.trim() || isCreating}
                            >
                              {isCreating ? 'Creating…' : 'Create'}
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateTask(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Task trigger button (same pattern as Project) */}
                      <FormControl>
                        <div
                          className={[
                            'flex items-center gap-2 h-10 w-full rounded-md border px-3 py-2 text-sm cursor-pointer',
                            'bg-background hover:bg-muted/50 transition-colors select-none',
                            !field.value ? 'text-muted-foreground' : '',
                          ].join(' ')}
                          role="button"
                          tabIndex={0}
                          onClick={() => setShowTaskPicker((v) => !v)}
                          onKeyDown={(e) => e.key === 'Enter' && setShowTaskPicker((v) => !v)}
                        >
                          <span className="flex-1 truncate">
                            {field.value
                              ? (availableTasks.find((t) => t.id === field.value)?.name ?? 'Unknown task')
                              : 'Select Task (optional)'}
                          </span>
                          {field.value ? (
                            <X
                              className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                field.onChange('');
                                setShowTaskPicker(false);
                              }}
                            />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />

                      {/* Inline Task Picker */}
                      {showTaskPicker && (
                        <div className="border rounded-lg bg-background shadow-md overflow-hidden mt-1">
                          <div className="px-3 pt-3 pb-2 border-b border-border">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                              <Input
                                autoFocus
                                placeholder="Search tasks…"
                                value={taskSearch}
                                onChange={(e) => setTaskSearch(e.target.value)}
                                className="pl-9 h-9"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                              Tasks ({filteredTasks.length})
                            </p>
                          </div>
                          <div className="max-h-[180px] overflow-y-auto px-2 py-1.5 space-y-0.5">
                            {filteredTasks.length === 0 ? (
                              <div className="py-8 text-center text-sm text-muted-foreground">
                                {availableTasks.length === 0
                                  ? 'No tasks yet. Create one with"+ New".'
                                  : 'No tasks match your search.'}
                              </div>
                            ) : (
                              filteredTasks.map((task) => (
                                <button
                                  key={task.id}
                                  type="button"
                                  className={[
                                    'w-full flex items-center gap-3 rounded-md px-2 py-2 text-left transition-colors',
                                    'hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                    field.value === task.id ? 'bg-primary/10 ring-1 ring-primary/30' : '',
                                  ].join(' ')}
                                  onClick={() => handlePickTask(task.id)}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{task.name}</div>
                                    {task.description && (
                                      <div className="text-xs text-muted-foreground truncate">{task.description}</div>
                                    )}
                                  </div>
                                  {field.value === task.id && (
                                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              )}

              {/* ── Hours ── */}
              {!showProjectPicker && !showTaskPicker && (
                <FormField
                  control={form.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Hours <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          min={0.5}
                          max={24}
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* ── Description ── */}
              {!showProjectPicker && !showTaskPicker && (
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="What did you work on?" className="resize-none" rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </form>
          </Form>
        </div>

        {/* ── Footer – border-t, px-6 py-4 (BidderQuotation pattern) ── */}
        <DialogFooter className="px-6 py-4 border-t border-border flex justify-end gap-2 shrink-0">
          <Button form="daily-log-form" type="submit">
            {entry ? 'Update Entry' : 'Save Entry'}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
