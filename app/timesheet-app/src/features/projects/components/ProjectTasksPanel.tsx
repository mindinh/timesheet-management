import { useState, useEffect } from 'react'
import { Plus, Trash, Pencil, Search, Check, X } from 'lucide-react'
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
import { useProjectStore } from '@/features/projects/store/projectStore'
import type { Task } from '@/shared/types'
import StatusDialog from '@/shared/components/common/StatusDialog'
import ConfirmDialog from '@/shared/components/common/ConfirmDialog'

const STATUS_COLORS: Record<string, string> = {
    Open: 'bg-info',
    InProgress: 'bg-warning',
    Completed: 'bg-success',
    Cancelled: 'bg-error',
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
    const { tasks, fetchTasks, addTask, updateTask, deleteTask } = useProjectStore()
    const projectTasks = tasks[projectId] || []

    const [showAddForm, setShowAddForm] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
    const [editData, setEditData] = useState({ name: '', description: '', status: 'Open' as Task['status'] })
    const [newTaskName, setNewTaskName] = useState('')
    const [newTaskDescription, setNewTaskDescription] = useState('')
    const [newTaskStatus, setNewTaskStatus] = useState<Task['status']>('Open')

    const [statusDialog, setStatusDialog] = useState<{ open: boolean; variant: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }>({
        open: false, variant: 'info', title: ''
    })
    const [confirmDialogState, setConfirmDialogState] = useState<{ open: boolean; title: string; description?: string; onConfirm: () => void }>({
        open: false, title: '', onConfirm: () => { }
    })

    useEffect(() => {
        fetchTasks(projectId)
    }, [projectId, fetchTasks])

    // Filter tasks by search query
    const filteredTasks = projectTasks.filter((task) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            task.name.toLowerCase().includes(q) ||
            (task.description || '').toLowerCase().includes(q) ||
            STATUS_LABELS[task.status].toLowerCase().includes(q)
        )
    })

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

    const handleStartEdit = (task: Task) => {
        setEditingTaskId(task.id)
        setEditData({ name: task.name, description: task.description || '', status: task.status })
    }

    const handleSaveEdit = async () => {
        if (!editingTaskId || !editData.name.trim()) return
        try {
            await updateTask(editingTaskId, {
                name: editData.name.trim(),
                description: editData.description.trim(),
                status: editData.status,
            })
            setEditingTaskId(null)
        } catch {
            setStatusDialog({ open: true, variant: 'error', title: 'Error', description: 'Failed to update task.' })
        }
    }

    const handleCancelEdit = () => {
        setEditingTaskId(null)
    }

    const handleDeleteTask = async (taskId: string) => {
        setConfirmDialogState({
            open: true,
            title: 'Delete Task',
            description: 'Are you sure you want to delete this task?',
            onConfirm: async () => {
                try {
                    await deleteTask(taskId, projectId)
                    if (editingTaskId === taskId) setEditingTaskId(null)
                } catch {
                    setStatusDialog({ open: true, variant: 'error', title: 'Error', description: 'Failed to delete task.' })
                }
            },
        })
    }

    return (
        <>
            <div>
                {/* Header with count */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Tasks ({projectTasks.length})
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

                {/* Search tasks */}
                {projectTasks.length > 0 && (
                    <div className="relative mb-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search tasks..."
                            className="h-8 text-sm pl-8"
                        />
                    </div>
                )}

                {/* Add Task Form */}
                {showAddForm && (
                    <div className="mb-3 p-3 border rounded-lg bg-muted/30 space-y-2">
                        <div>
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
                        <div>
                            <Label htmlFor="taskDesc" className="text-xs">Description</Label>
                            <Input
                                id="taskDesc"
                                value={newTaskDescription}
                                onChange={(e) => setNewTaskDescription(e.target.value)}
                                placeholder="Optional description"
                                className="h-8 text-sm"
                            />
                        </div>
                        <div>
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
                        <div className="flex gap-2 justify-end pt-1">
                            <Button size="sm" onClick={handleAddTask} disabled={!newTaskName.trim()}>
                                Add
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {/* Task List */}
                <div className="space-y-0.5">
                    {filteredTasks.map((task) => (
                        <div key={task.id}>
                            {editingTaskId === task.id ? (
                                /* Inline edit form */
                                <div className="p-2 rounded-md border bg-muted/30 space-y-2">
                                    <Input
                                        value={editData.name}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                        className="h-7 text-sm"
                                        autoFocus
                                    />
                                    <Input
                                        value={editData.description}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                        placeholder="Description"
                                        className="h-7 text-sm"
                                    />
                                    <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v as Task['status'] })}>
                                        <SelectTrigger className="h-7 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex gap-1 justify-end">
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit} disabled={!editData.name.trim()}>
                                            <Check className="h-3.5 w-3.5 text-primary" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                /* Normal task row */
                                <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors group">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[task.status]}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{task.name}</div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            {STATUS_LABELS[task.status]}
                                            {task.description && ` · ${task.description}`}
                                        </div>
                                    </div>
                                    <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                                            onClick={() => handleStartEdit(task)}
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleDeleteTask(task.id)}
                                        >
                                            <Trash className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {filteredTasks.length === 0 && searchQuery && (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                            No tasks match "{searchQuery}"
                        </div>
                    )}

                    {projectTasks.length === 0 && !showAddForm && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                            No tasks yet. Click "+ Add Task" to create one.
                        </div>
                    )}
                </div>
            </div>

            <StatusDialog
                open={statusDialog.open}
                onOpenChange={(open) => setStatusDialog(prev => ({ ...prev, open }))}
                variant={statusDialog.variant}
                title={statusDialog.title}
                description={statusDialog.description}
            />
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
