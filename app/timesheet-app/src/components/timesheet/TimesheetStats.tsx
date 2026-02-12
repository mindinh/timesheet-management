import { Calendar, Zap, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { TimesheetEntry } from '@/types'

interface TimesheetStatsProps {
    entries: TimesheetEntry[]
    workingDays?: number
}

export function TimesheetStats({ entries, workingDays = 22 }: TimesheetStatsProps) {
    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)
    const uniqueDays = new Set(entries.map(e => e.date)).size
    const utilization = workingDays > 0 ? ((totalHours / (workingDays * 8)) * 100).toFixed(1) : '0.0'
    const overtime = Math.max(0, totalHours - (workingDays * 8))

    const stats = [
        {
            icon: Calendar,
            label: 'LOGGED DAYS',
            value: uniqueDays.toString(),
            color: 'text-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-950/30'
        },
        {
            icon: Zap,
            label: 'UTILIZATION',
            value: `${utilization}%`,
            color: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-950/30'
        },
        {
            icon: Clock,
            label: 'OVERTIME',
            value: `${overtime.toFixed(2)} H`,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50 dark:bg-orange-950/30'
        },
        {
            icon: CheckCircle,
            label: 'APPROVALS',
            value: 'Pending',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50 dark:bg-purple-950/30',
            isItalic: true
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
                <Card key={stat.label} className="border-0 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {stat.label}
                                </p>
                                <p className={`text-2xl font-bold mt-1 ${stat.isItalic ? 'italic' : ''}`}>
                                    {stat.value}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
