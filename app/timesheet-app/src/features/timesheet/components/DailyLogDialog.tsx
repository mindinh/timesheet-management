import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { TimesheetEntry, ProjectType } from '@/shared/types'
import { useProjectStore } from '@/features/projects/store/projectStore'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'

const formSchema = z.object({
    projectId: z.string().min(1, 'Project is required'),
    taskId: z.string().optional(),
    hours: z.coerce
        .number()
        .min(0.1, 'Minimum 0.1 hours')
        .max(24, 'Maximum 24 hours')
        .refine((val) => val % 0.5 === 0, 'Hours must be in 0.5 increments'),
    description: z.string().optional(),
})

// Explicitly define the form data type
type FormData = z.infer<typeof formSchema>

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
    { value: 'Papierkram', label: 'Papierkram' },
    { value: 'Internal', label: 'Internal' },
    { value: 'External', label: 'External' },
    { value: 'Other', label: 'Other' },
]

interface DailyLogDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    date: Date
    onSubmit: (data: FormData) => void
    entry?: TimesheetEntry
}

export function DailyLogDialog({ open, onOpenChange, date, onSubmit, entry }: DailyLogDialogProps) {
    const { projects, fetchProjects, tasks, fetchTasks, addProject, addTask } = useProjectStore()
    const { currentUser } = useTimesheetStore()

    // Inline creation dialog states
    const [showCreateProject, setShowCreateProject] = useState(false)
    const [showCreateTask, setShowCreateTask] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    // Create Project form state
    const [newProject, setNewProject] = useState({ name: '', code: '', type: 'Other' as ProjectType })

    // Create Task form state
    const [newTask, setNewTask] = useState({ name: '', description: '' })

    // Use 'any' for the resolver to bypass strict type checking issues between Zod and React Hook Form
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            projectId: '',
            taskId: '',
            hours: 8,
            description: '',
        },
    })

    const selectedProjectId = form.watch('projectId')

    useEffect(() => {
        if (open && projects.length === 0 && currentUser?.id) {
            fetchProjects(currentUser.id)
        }
    }, [open, projects.length, fetchProjects, currentUser])

    // Fetch tasks when a project is selected
    useEffect(() => {
        if (selectedProjectId) {
            fetchTasks(selectedProjectId)
        }
    }, [selectedProjectId, fetchTasks])

    useEffect(() => {
        if (open) {
            if (entry) {
                form.reset({
                    projectId: entry.projectId,
                    taskId: entry.taskId || '',
                    hours: entry.hours,
                    description: entry.description || '',
                })
            } else {
                form.reset({
                    projectId: '',
                    taskId: '',
                    hours: 8,
                    description: '',
                })
            }
            // Reset inline creation states
            setShowCreateProject(false)
            setShowCreateTask(false)
        }

    }, [open, entry, form])

    // Filter tasks to only show Open or InProgress
    const availableTasks = useMemo(() => {
        if (!selectedProjectId) return []
        const projectTasks = tasks[selectedProjectId] || []
        return projectTasks.filter(t => t.status === 'Open' || t.status === 'InProgress')
    }, [selectedProjectId, tasks])

    const handleSubmit = (data: FormData) => {
        // Clean up empty taskId
        const submitData = {
            ...data,
            taskId: data.taskId || undefined,
        }
        onSubmit(submitData)
        form.reset()
        onOpenChange(false)
    }

    // --- Inline creation handlers ---

    const handleCreateProject = async () => {
        if (!newProject.name.trim() || !newProject.code.trim() || !currentUser?.id) return
        setIsCreating(true)
        try {
            const created = await addProject(
                {
                    name: newProject.name.trim(),
                    code: newProject.code.trim(),
                    type: newProject.type,
                    isActive: true,
                },
                currentUser.id
            )
            if (created) {
                form.setValue('projectId', created.id)
                form.setValue('taskId', '')
            }
            setNewProject({ name: '', code: '', type: 'Other' })
            setShowCreateProject(false)
        } catch {
            // Error is logged in the store
        } finally {
            setIsCreating(false)
        }
    }

    const handleCreateTask = async () => {
        if (!newTask.name.trim() || !selectedProjectId) return
        setIsCreating(true)
        try {
            const created = await addTask({
                projectId: selectedProjectId,
                name: newTask.name.trim(),
                description: newTask.description.trim(),
                status: 'Open',
            })
            if (created) {
                form.setValue('taskId', created.id)
            }
            setNewTask({ name: '', description: '' })
            setShowCreateTask(false)
        } catch {
            // Error is logged in the store
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{entry ? 'Edit Entry' : 'Log Time'} - {format(date, 'MMM d, yyyy')}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        {/* ── Project Field ── */}
                        <FormField
                            control={form.control}
                            name="projectId"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel>Project</FormLabel>
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

                                    {/* Inline Create Project Form */}
                                    {showCreateProject && (
                                        <div className="p-3 border rounded-lg bg-muted/30 space-y-3 mb-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <Label htmlFor="newProjectName" className="text-xs">Name</Label>
                                                    <Input
                                                        id="newProjectName"
                                                        value={newProject.name}
                                                        onChange={(e) => setNewProject(p => ({ ...p, name: e.target.value }))}
                                                        placeholder="e.g. Cloud Migration"
                                                        className="h-8 text-sm"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="newProjectCode" className="text-xs">Code</Label>
                                                    <Input
                                                        id="newProjectCode"
                                                        value={newProject.code}
                                                        onChange={(e) => setNewProject(p => ({ ...p, code: e.target.value }))}
                                                        placeholder="e.g. P001"
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-xs">Type</Label>
                                                <Select
                                                    value={newProject.type}
                                                    onValueChange={(v) => setNewProject(p => ({ ...p, type: v as ProjectType }))}
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
                                                    {isCreating ? 'Creating...' : 'Create'}
                                                </Button>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateProject(false)}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <Select
                                        onValueChange={(value) => {
                                            field.onChange(value)
                                            // Reset task when project changes
                                            form.setValue('taskId', '')
                                        }}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Project" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {projects.map((project) => (
                                                <SelectItem key={project.id} value={project.id}>
                                                    {project.name} ({project.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* ── Task Field ── (only visible when a project is selected) */}
                        {selectedProjectId && (
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

                                        {/* Inline Create Task Form */}
                                        {showCreateTask && (
                                            <div className="p-3 border rounded-lg bg-muted/30 space-y-3 mb-2">
                                                <div>
                                                    <Label htmlFor="newTaskName" className="text-xs">Task Name</Label>
                                                    <Input
                                                        id="newTaskName"
                                                        value={newTask.name}
                                                        onChange={(e) => setNewTask(t => ({ ...t, name: e.target.value }))}
                                                        placeholder="e.g. Development"
                                                        className="h-8 text-sm"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="newTaskDesc" className="text-xs">Description</Label>
                                                    <Input
                                                        id="newTaskDesc"
                                                        value={newTask.description}
                                                        onChange={(e) => setNewTask(t => ({ ...t, description: e.target.value }))}
                                                        placeholder="Optional description"
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleCreateTask}
                                                        disabled={!newTask.name.trim() || isCreating}
                                                    >
                                                        {isCreating ? 'Creating...' : 'Create'}
                                                    </Button>
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateTask(false)}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={availableTasks.length > 0 ? 'Select Task' : 'No tasks available'} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {availableTasks.map((task) => (
                                                    <SelectItem key={task.id} value={task.id}>
                                                        {task.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="hours"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hours</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.5"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit">{entry ? 'Update Entry' : 'Save Entry'}</Button>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
