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
import { format } from 'date-fns'
import { useEffect, useMemo } from 'react'
import type { TimesheetEntry } from '@/shared/types'
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

interface DailyLogDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    date: Date
    onSubmit: (data: FormData) => void
    entry?: TimesheetEntry
}

export function DailyLogDialog({ open, onOpenChange, date, onSubmit, entry }: DailyLogDialogProps) {
    const { projects, fetchProjects, tasks, fetchTasks } = useProjectStore()
    const { currentUser } = useTimesheetStore()

    // Use 'any' for the resolver to bypass strict type checking issues between Zod and React Hook Form
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{entry ? 'Edit Entry' : 'Log Time'} - {format(date, 'MMM d, yyyy')}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="projectId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Project</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            field.onChange(value)
                                            // Reset task when project changes
                                            form.setValue('taskId', '')
                                        }}
                                        defaultValue={field.value}
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

                        {/* Task Selection - only visible when a project is selected */}
                        {selectedProjectId && (
                            <FormField
                                control={form.control}
                                name="taskId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Task</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">{entry ? 'Update Entry' : 'Save Entry'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
