import { Calendar, Zap, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { getDaysInMonth } from 'date-fns'
import type { TimesheetEntry, TimesheetStatusType } from '@/shared/types'

interface TimesheetStatsProps {
    entries: TimesheetEntry[]
    currentMonth: Date
    status?: TimesheetStatusType
    workingDays?: number
}

export function TimesheetStats({ entries, currentMonth, status = 'Draft', workingDays = 22 }: TimesheetStatsProps) {
    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)
    const uniqueDays = new Set(entries.map(e => e.date)).size
    const daysInMonth = getDaysInMonth(currentMonth)
    const utilization = workingDays > 0 ? ((totalHours / (workingDays * 8)) * 100).toFixed(1) : '0.0'
    const overtime = Math.max(0, totalHours - (workingDays * 8))

    const approvalLabel = () => {
        if (status === 'Approved' || status === 'Finished') return 'Approved'
        if (status === 'Approved_By_TeamLead') return 'Partial'
        if (status === 'Submitted') return 'Pending'
        if (status === 'Rejected') return 'Rejected'
        return 'Pending'
    }

    const stats = [
        {
            icon: Calendar,
            label: 'LOGGED DAYS',
            value: `${uniqueDays}`,
            suffix: `/ ${daysInMonth}`,
            color: 'text-info',
            bgColor: 'bg-info-bg'
        },
        {
            icon: Zap,
            label: 'UTILIZATION',
            value: `${utilization}%`,
            color: 'text-success',
            bgColor: 'bg-success-bg'
        },
        {
            icon: Clock,
            label: 'OVERTIME',
            value: `${overtime.toFixed(2)}`,
            suffix: 'H',
            color: 'text-warning',
            bgColor: 'bg-warning-bg'
        },
        {
            icon: CheckCircle,
            label: 'APPROVALS',
            value: approvalLabel(),
            color: 'text-muted-foreground',
            bgColor: 'bg-muted',
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
                <Card key={stat.label} className="border-0 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {stat.label}
                                </p>
                                <p className="text-2xl font-bold mt-1">
                                    {stat.value}
                                    {stat.suffix && (
                                        <span className="text-sm font-normal text-muted-foreground ml-1">
                                            {stat.suffix}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
