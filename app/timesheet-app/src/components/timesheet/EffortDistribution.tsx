import type { TimesheetEntry, Project } from '@/types'

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
        .slice(0, 3) // Top 3 projects

    const colors = [
        'bg-blue-600',
        'bg-purple-600',
        'bg-gray-600'
    ]

    if (projectData.length === 0) {
        return null
    }

    return (
        <div className="mt-6 p-6 bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide">
                    Effort Distribution
                </h3>
                <p className="text-xs text-muted-foreground">
                    Total: {totalHours.toFixed(1)}h
                </p>
            </div>

            <div className="space-y-4">
                {projectData.map((project, index) => (
                    <div key={project.projectId} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{project.projectName}</span>
                            <span className="text-muted-foreground">{project.percentage}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full ${colors[index % colors.length]} transition-all duration-300`}
                                style={{ width: `${project.percentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
