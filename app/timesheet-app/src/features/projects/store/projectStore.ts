import { create } from 'zustand'
import type { Project, Task } from '@/shared/types'
import { getProjectsByUser, createProject, updateProject as updateProjectApi, deleteProject as deleteProjectApi } from '@/features/projects/api/project-api'
import { getTasksByProject, createTask, updateTask as updateTaskApi, deleteTask as deleteTaskApi } from '@/features/tasks/api/task-api'

interface ProjectState {
    projects: Project[]
    tasks: Record<string, Task[]> // key: projectId
    isLoading: boolean

    // Project Actions
    fetchProjects: (userId: string) => Promise<void>
    addProject: (project: Omit<Project, 'id'>, userId: string) => Promise<void>
    updateProject: (id: string, project: Partial<Project>) => Promise<void>
    deleteProject: (id: string) => Promise<void>

    // Task Actions
    fetchTasks: (projectId: string) => Promise<void>
    addTask: (task: Omit<Task, 'id'>) => Promise<void>
    updateTask: (id: string, task: Partial<Task>) => Promise<void>
    deleteTask: (id: string, projectId: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set) => ({
    projects: [],
    tasks: {},
    isLoading: false,

    fetchProjects: async (userId) => {
        set({ isLoading: true })
        try {
            if (!userId) {
                set({ isLoading: false })
                return
            }
            const projects = await getProjectsByUser(userId)
            set({ projects, isLoading: false })
        } catch (error) {
            console.error('Failed to fetch projects:', error)
            set({ isLoading: false })
        }
    },

    addProject: async (project, userId) => {
        set({ isLoading: true })
        try {
            const newProject = await createProject({
                ...project,
                user_ID: userId,
            })
            set((state) => ({
                projects: [...state.projects, newProject],
                isLoading: false,
            }))
        } catch (error) {
            console.error('Failed to create project:', error)
            set({ isLoading: false })
            throw error
        }
    },

    updateProject: async (id, project) => {
        set({ isLoading: true })
        try {
            const updatedProject = await updateProjectApi(id, project)
            set((state) => ({
                projects: state.projects.map((p) =>
                    p.id === id ? { ...p, ...updatedProject } : p
                ),
                isLoading: false,
            }))
        } catch (error) {
            console.error('Failed to update project:', error)
            set({ isLoading: false })
            throw error
        }
    },

    deleteProject: async (id) => {
        set({ isLoading: true })
        try {
            await deleteProjectApi(id)
            set((state) => ({
                projects: state.projects.filter((p) => p.id !== id),
                isLoading: false,
            }))
        } catch (error) {
            console.error('Failed to delete project:', error)
            set({ isLoading: false })
            throw error
        }
    },

    fetchTasks: async (projectId) => {
        try {
            const tasks = await getTasksByProject(projectId)
            set((state) => ({
                tasks: { ...state.tasks, [projectId]: tasks },
            }))
        } catch (error) {
            console.error('Failed to fetch tasks:', error)
        }
    },

    addTask: async (task) => {
        try {
            const newTask = await createTask(task)
            set((state) => ({
                tasks: {
                    ...state.tasks,
                    [task.projectId]: [...(state.tasks[task.projectId] || []), newTask],
                },
            }))
        } catch (error) {
            console.error('Failed to create task:', error)
            throw error
        }
    },

    updateTask: async (id, task) => {
        try {
            const updated = await updateTaskApi(id, task)
            const projectId = updated.projectId
            set((state) => ({
                tasks: {
                    ...state.tasks,
                    [projectId]: (state.tasks[projectId] || []).map((t) =>
                        t.id === id ? { ...t, ...updated } : t
                    ),
                },
            }))
        } catch (error) {
            console.error('Failed to update task:', error)
            throw error
        }
    },

    deleteTask: async (id, projectId) => {
        try {
            await deleteTaskApi(id)
            set((state) => ({
                tasks: {
                    ...state.tasks,
                    [projectId]: (state.tasks[projectId] || []).filter((t) => t.id !== id),
                },
            }))
        } catch (error) {
            console.error('Failed to delete task:', error)
            throw error
        }
    },
}))
