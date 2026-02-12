import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import type { Project } from '@/shared/types'

export default function ProjectsPage() {
    const { projects, isLoading, fetchProjects, addProject, updateProject, deleteProject } =
        useTimesheetStore()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingProject, setEditingProject] = useState<Project | undefined>(undefined)
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        isActive: true,
    })

    useEffect(() => {
        fetchProjects()
    }, [fetchProjects])

    const handleCreate = () => {
        setEditingProject(undefined)
        setFormData({ name: '', code: '', description: '', isActive: true })
        setIsDialogOpen(true)
    }

    const handleEdit = (project: Project) => {
        setEditingProject(project)
        setFormData({
            name: project.name,
            code: project.code,
            description: '',
            isActive: project.isActive,
        })
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this project?')) {
            try {
                await deleteProject(id)
            } catch (error) {
                alert('Failed to delete project')
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editingProject) {
                await updateProject(editingProject.id, formData)
            } else {
                await addProject(formData)
            }
            setIsDialogOpen(false)
        } catch (error) {
            alert('Failed to save project')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Projects</h1>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-12">Loading...</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                        <Card key={project.id}>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>{project.name}</span>
                                    <span className="text-sm font-mono text-muted-foreground">
                                        {project.code}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`text-sm ${project.isActive ? 'text-green-600' : 'text-gray-400'}`}
                                    >
                                        {project.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(project)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(project.id)}
                                        >
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingProject ? 'Edit Project' : 'Create Project'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Project Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
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
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {editingProject ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
