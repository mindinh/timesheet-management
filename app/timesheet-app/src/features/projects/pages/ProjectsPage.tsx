import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Trash, ChevronDown, ChevronRight, ListTodo } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import { useProjectStore } from '@/features/projects/store/projectStore'
import { ProjectTasksPanel } from '@/features/projects/components/ProjectTasksPanel'
import type { Project, ProjectType } from '@/shared/types'
import StatusDialog from '@/shared/components/common/StatusDialog'
import ConfirmDialog from '@/shared/components/common/ConfirmDialog'
import { useTranslation } from 'react-i18next'

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
    { value: 'Papierkram', label: 'Papierkram' },
    { value: 'Internal', label: 'Internal' },
    { value: 'External', label: 'External' },
    { value: 'Other', label: 'Other' },
]

const TYPE_COLORS: Record<ProjectType, string> = {
    Papierkram: 'bg-warning-bg text-warning',
    Internal: 'bg-info-bg text-info',
    External: 'bg-primary/10 text-primary',
    Other: 'bg-muted text-muted-foreground',
}

export default function ProjectsPage() {
    const { t } = useTranslation()
    const { currentUser } = useTimesheetStore()
    const { projects, tasks, isLoading, fetchProjects, addProject, updateProject, deleteProject } =
        useProjectStore()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingProject, setEditingProject] = useState<Project | undefined>(undefined)
    const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        type: 'Other' as ProjectType,
        isActive: true,
    })

    // Dialog state
    const [statusDialog, setStatusDialog] = useState<{ open: boolean; variant: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }>({
        open: false, variant: 'info', title: ''
    })
    const [confirmDialogState, setConfirmDialogState] = useState<{ open: boolean; title: string; description?: string; onConfirm: () => void }>({
        open: false, title: '', onConfirm: () => { }
    })

    useEffect(() => {
        if (currentUser?.id) {
            fetchProjects(currentUser.id)
        }
    }, [fetchProjects, currentUser])

    const handleCreate = () => {
        setEditingProject(undefined)
        setFormData({ name: '', code: '', description: '', type: 'Other', isActive: true })
        setIsDialogOpen(true)
    }

    const handleEdit = (project: Project) => {
        setEditingProject(project)
        setFormData({
            name: project.name,
            code: project.code,
            description: project.description || '',
            type: project.type || 'Other',
            isActive: project.isActive,
        })
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: string) => {
        setConfirmDialogState({
            open: true,
            title: 'Delete Project',
            description: 'Are you sure you want to delete this project?',
            onConfirm: async () => {
                try {
                    await deleteProject(id)
                } catch {
                    setStatusDialog({ open: true, variant: 'error', title: 'Delete Failed', description: 'Failed to delete project.' })
                }
            },
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentUser?.id) return

        try {
            if (editingProject) {
                await updateProject(editingProject.id, formData)
            } else {
                await addProject(formData, currentUser.id)
            }
            setIsDialogOpen(false)
        } catch {
            setStatusDialog({ open: true, variant: 'error', title: 'Save Failed', description: 'Failed to save project.' })
        }
    }

    const toggleExpand = (projectId: string) => {
        setExpandedProjectId((prev) => (prev === projectId ? null : projectId))
    }

    const getTaskCount = (projectId: string) => (tasks[projectId] || []).length

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{t('projects.title')}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('projects.description')}
                        </p>
                    </div>
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('projects.create')}
                    </Button>
                </div>

                {/* Projects Table */}
                {isLoading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : (
                    <Card className="border shadow-sm">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[80px]">{t('projects.table.id')}</TableHead>
                                        <TableHead>{t('projects.table.name')}</TableHead>
                                        <TableHead>{t('projects.table.type')}</TableHead>
                                        <TableHead>{t('projects.table.tasks')}</TableHead>
                                        <TableHead>{t('projects.table.status')}</TableHead>
                                        <TableHead className="text-right">{t('projects.table.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projects.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                                {t('projects.noProjects')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        projects.map((project) => {
                                            const isExpanded = expandedProjectId === project.id
                                            const taskCount = getTaskCount(project.id)

                                            return (
                                                <React.Fragment key={project.id}>
                                                    <TableRow className={isExpanded ? 'bg-muted/10' : ''}>
                                                        {/* Expand + ID */}
                                                        <TableCell>
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                    onClick={() => toggleExpand(project.id)}
                                                                >
                                                                    {isExpanded ? (
                                                                        <ChevronDown className="h-4 w-4" />
                                                                    ) : (
                                                                        <ChevronRight className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                                <span className="text-xs text-muted-foreground">
                                                                    #{project.code}
                                                                </span>
                                                            </div>
                                                        </TableCell>

                                                        {/* Project Name */}
                                                        <TableCell>
                                                            <div className="font-medium">{project.name}</div>
                                                            {project.description && (
                                                                <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">
                                                                    {project.description}
                                                                </div>
                                                            )}
                                                        </TableCell>

                                                        {/* Type */}
                                                        <TableCell>
                                                            <Badge
                                                                variant="secondary"
                                                                className={`text-xs ${TYPE_COLORS[project.type || 'Other']}`}
                                                            >
                                                                {project.type || 'Other'}
                                                            </Badge>
                                                        </TableCell>

                                                        {/* Tasks Count */}
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                                <ListTodo className="h-3.5 w-3.5" />
                                                                {taskCount > 0 ? (
                                                                    <span>{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
                                                                ) : (
                                                                    <span>No tasks</span>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        {/* Status */}
                                                        <TableCell>
                                                            <Badge
                                                                variant="secondary"
                                                                className={
                                                                    project.isActive
                                                                        ? 'bg-status-completed text-status-completed-text'
                                                                        : 'bg-muted text-muted-foreground'
                                                                }
                                                            >
                                                                {project.isActive ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                        </TableCell>

                                                        {/* Actions */}
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center gap-1 justify-end">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => handleEdit(project)}
                                                                    title="Edit project"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                    onClick={() => handleDelete(project.id)}
                                                                    title="Delete project"
                                                                >
                                                                    <Trash className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Expanded Task Panel */}
                                                    {isExpanded && (
                                                        <TableRow className="hover:bg-transparent">
                                                            <TableCell colSpan={6} className="p-0">
                                                                <div className="px-6 pb-4">
                                                                    <ProjectTasksPanel
                                                                        projectId={project.id}
                                                                        onClose={() => setExpandedProjectId(null)}
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Create / Edit Project Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingProject ? 'Edit Project' : 'Create Project'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="name">Project Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        placeholder="e.g. Cloud Migration"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="code">Project Code</Label>
                                    <Input
                                        id="code"
                                        value={formData.code}
                                        onChange={(e) =>
                                            setFormData({ ...formData, code: e.target.value })
                                        }
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
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    placeholder="Optional project description"
                                />
                            </div>
                            <div>
                                <Label htmlFor="type">Project Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val) =>
                                        setFormData({ ...formData, type: val as ProjectType })
                                    }
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
                                <Button type="submit">
                                    {editingProject ? 'Update' : 'Create'}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
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
