import type { TimesheetEntry, Project } from '@/shared/types'

interface EffortDistributionProps {
    entries: TimesheetEntry[]
    projects: Project[]
}

export function EffortDistribution({ entries, projects }: EffortDistributionProps) {
    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)

    // Calculate hours per project
    const projectHours = entries.reduce((acc, entry) => {
        acc[entry.projectId] = (acc[entry.projectId] || 0) + entry.hours
        return acc
    }, {} as Record<string, number>)

    const projectData = Object.entries(projectHours)
        .map(([projectId, hours]) => {
            const project = projects.find(p => p.id === projectId)
            const percentage = totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0
            return {
                projectId,
                projectName: project?.name || 'Unknown Project',
                hours,
                percentage
            }
        })
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 3)

    const colors = [
        'bg-blue-600',
        'bg-indigo-500',
        'bg-gray-400'
    ]

    if (projectData.length === 0) {
        return null
    }

    return (
        <div className="p-5 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Effort Distribution
                </h3>
                <p className="text-xs text-muted-foreground">
                    Total: {totalHours.toFixed(1)}h
                </p>
            </div>

            {/* Horizontal layout matching reference */}
            <div className="flex items-center gap-8">
                {projectData.map((project, index) => (
                    <div key={project.projectId} className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="font-medium truncate">{project.projectName}</span>
                            <span className="text-muted-foreground ml-2 tabular-nums">{project.percentage}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                                style={{ width: `${project.percentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
