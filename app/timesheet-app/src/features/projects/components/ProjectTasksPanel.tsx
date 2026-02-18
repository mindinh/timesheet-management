import { useState, useEffect } from 'react'
import { Plus, Trash } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'
import { Card, CardContent } from '@/shared/components/ui/card'
import { useProjectStore } from '@/features/projects/store/projectStore'
import type { Task } from '@/shared/types'
import StatusDialog from '@/shared/components/common/StatusDialog'
import ConfirmDialog from '@/shared/components/common/ConfirmDialog'

const STATUS_COLORS: Record<string, string> = {
    Open: 'bg-[var(--sap-informative)]',
    InProgress: 'bg-[var(--sap-critical)]',
    Completed: 'bg-[var(--sap-positive)]',
    Cancelled: 'bg-[var(--sap-negative)]',
}

const STATUS_LABELS: Record<string, string> = {
    Open: 'Open',
    InProgress: 'In Progress',
    Completed: 'Completed',
    Cancelled: 'Cancelled',
}

interface ProjectTasksPanelProps {
    projectId: string
    onClose: () => void
}

export function ProjectTasksPanel({ projectId }: ProjectTasksPanelProps) {
    const { tasks, fetchTasks, addTask, deleteTask } = useProjectStore()
    const projectTasks = tasks[projectId] || []

    const [showAddForm, setShowAddForm] = useState(false)
    const [newTaskName, setNewTaskName] = useState('')
    const [newTaskDescription, setNewTaskDescription] = useState('')
    const [newTaskStatus, setNewTaskStatus] = useState<Task['status']>('Open')

    // Dialog state
    const [statusDialog, setStatusDialog] = useState<{ open: boolean; variant: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }>({
        open: false, variant: 'info', title: ''
    })
    const [confirmDialogState, setConfirmDialogState] = useState<{ open: boolean; title: string; description?: string; onConfirm: () => void }>({
        open: false, title: '', onConfirm: () => { }
    })

    useEffect(() => {
        fetchTasks(projectId)
    }, [projectId, fetchTasks])

    const handleAddTask = async () => {
        if (!newTaskName.trim()) return
        try {
            await addTask({
                projectId,
                name: newTaskName.trim(),
                description: newTaskDescription.trim(),
                status: newTaskStatus,
            })
            setNewTaskName('')
            setNewTaskDescription('')
            setNewTaskStatus('Open')
            setShowAddForm(false)
        } catch {
            setStatusDialog({ open: true, variant: 'error', title: 'Error', description: 'Failed to add task.' })
        }
    }

    const handleDeleteTask = async (taskId: string) => {
        setConfirmDialogState({
            open: true,
            title: 'Delete Task',
            description: 'Are you sure you want to delete this task?',
            onConfirm: async () => {
                try {
                    await deleteTask(taskId, projectId)
                } catch {
                    setStatusDialog({ open: true, variant: 'error', title: 'Error', description: 'Failed to delete task.' })
                }
            },
        })
    }

    return (
        <>
            <div className="border-t pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Manage Tasks
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary/80 text-xs gap-1"
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        <Plus className="h-3 w-3" />
                        Add Task
                    </Button>
                </div>

                {/* Task Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {projectTasks.map((task) => (
                        <Card key={task.id} className="border shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2 min-w-0">
                                        <div
                                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${STATUS_COLORS[task.status]}`}
                                        />
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium truncate">
                                                {task.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {STATUS_LABELS[task.status]}
                                                {task.description && ` · ${task.description}`}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDeleteTask(task.id)}
                                    >
                                        <Trash className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {projectTasks.length === 0 && !showAddForm && (
                        <div className="col-span-full text-center py-4 text-sm text-muted-foreground italic">
                            No tasks yet. Click "+ Add Task" to create one.
                        </div>
                    )}
                </div>

                {/* Add Task Form */}
                {showAddForm && (
                    <div className="mt-3 p-3 border rounded-lg bg-muted/30 space-y-3">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Label htmlFor="taskName" className="text-xs">Task Name</Label>
                                <Input
                                    id="taskName"
                                    value={newTaskName}
                                    onChange={(e) => setNewTaskName(e.target.value)}
                                    placeholder="e.g. Development"
                                    className="h-8 text-sm"
                                    autoFocus
                                />
                            </div>
                            <div className="flex-1">
                                <Label htmlFor="taskDesc" className="text-xs">Description</Label>
                                <Input
                                    id="taskDesc"
                                    value={newTaskDescription}
                                    onChange={(e) => setNewTaskDescription(e.target.value)}
                                    placeholder="e.g. Billable · High Density"
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="w-[140px]">
                                <Label className="text-xs">Status</Label>
                                <Select value={newTaskStatus} onValueChange={(v) => setNewTaskStatus(v as Task['status'])}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleAddTask} disabled={!newTaskName.trim()}>
                                Add
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Dialog */}
            <StatusDialog
                open={statusDialog.open}
                onOpenChange={(open) => setStatusDialog(prev => ({ ...prev, open }))}
                variant={statusDialog.variant}
                title={statusDialog.title}
                description={statusDialog.description}
            />

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={confirmDialogState.open}
                onOpenChange={(open) => setConfirmDialogState(prev => ({ ...prev, open }))}
                title={confirmDialogState.title}
                description={confirmDialogState.description}
                onConfirm={confirmDialogState.onConfirm}
            />
        </>
    )
}
