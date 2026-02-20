import { useState, useMemo } from 'react'
import { format, isToday, isYesterday, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns'
import { Copy, Plus, Trash, Pencil } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'
import { Input } from '@/shared/components/ui/input'
import type { TimesheetEntry, Project, Task } from '@/shared/types'


interface DailyEntryListProps {
    currentMonth: Date
    entries: TimesheetEntry[]
    projects: Project[]
    tasks?: Task[]
    onAddEntry: (date: string) => void
    onDuplicateDay?: (date: string) => void
    onEditEntry: (entry: TimesheetEntry) => void
    onDeleteEntry: (entryId: string) => void
    readOnly?: boolean
}

const INITIAL_DAYS_TO_SHOW = 5

export function DailyEntryList({
    currentMonth,
    entries,
    projects,
    tasks = [],
    onAddEntry,
    onDuplicateDay,
    onEditEntry,
    onDeleteEntry,
    readOnly = false,
}: DailyEntryListProps) {
    const [visibleDays, setVisibleDays] = useState(INITIAL_DAYS_TO_SHOW)

    // Generate all days in the current month
    const allDaysInMonth = useMemo(() => {
        const start = startOfMonth(currentMonth)
        const end = endOfMonth(currentMonth)
        const days = eachDayOfInterval({ start, end })
        return days.reverse()
    }, [currentMonth])

    // Group entries by date
    const groupedEntries = useMemo(() => {
        return entries.reduce((acc, entry) => {
            if (!acc[entry.date]) {
                acc[entry.date] = []
            }
            acc[entry.date].push(entry)
            return acc
        }, {} as Record<string, TimesheetEntry[]>)
    }, [entries])

    const getDateLabel = (date: Date) => {
        if (isToday(date)) return 'TODAY'
        if (isYesterday(date)) return 'YESTERDAY'
        if (isWeekend(date)) return 'WEEKEND'
        return format(date, 'EEEE').toUpperCase()
    }

    const getDailyTotal = (dateStr: string) => {
        const dayEntries = groupedEntries[dateStr] || []
        return dayEntries.reduce((sum, e) => sum + e.hours, 0).toFixed(2)
    }

    const handleLoadMore = () => {
        setVisibleDays(prev => Math.min(prev + 10, allDaysInMonth.length))
    }

    const handleDuplicateDay = (dateStr: string) => {
        if (onDuplicateDay) {
            onDuplicateDay(dateStr)
        }
    }

    // Get tasks for a specific project
    const getTasksForProject = (projectId: string) => {
        return tasks.filter(t => t.projectId === projectId)
    }

    const visibleDaysList = allDaysInMonth.slice(0, visibleDays)
    const hasMore = visibleDays < allDaysInMonth.length

    return (
        <div className="space-y-1">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                <div className="col-span-2">Date / Status</div>
                <div className="col-span-2">Project</div>
                <div className="col-span-2">Task</div>
                <div className="col-span-3">Task Description</div>
                <div className="col-span-1 text-right">HRS</div>
                <div className="col-span-2 text-right">Action</div>
            </div>

            {/* Daily Entries */}
            {visibleDaysList.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayEntries = groupedEntries[dateStr] || []
                const dailyTotal = getDailyTotal(dateStr)
                const dateLabel = getDateLabel(day)
                const isWeekendDay = isWeekend(day)

                return (
                    <Card key={dateStr} className={`border-0 shadow-sm ${isWeekendDay ? 'bg-amber-50/60 border-l-2 border-l-amber-300' : ''}`}>
                        <CardContent className="p-0">
                            {/* Date Header Row */}
                            <div className="flex items-center justify-between px-6 py-3 border-b border-border/50">
                                <div className="col-span-2">
                                    <div className="text-sm font-semibold">
                                        {format(day, 'MMM dd, EEE')}
                                    </div>
                                    <div className={`text-[11px] font-semibold ${isToday(day) ? 'text-sap-informative' :
                                        isWeekendDay ? '' :
                                            'text-sap-informative'
                                        }`}>
                                        {dateLabel}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-lg font-bold text-sap-informative tabular-nums min-w-[60px] text-right">
                                        {dailyTotal}
                                    </div>
                                    {!readOnly && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => handleDuplicateDay(dateStr)}
                                                title="Duplicate day"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="icon"
                                                className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
                                                onClick={() => onAddEntry(dateStr)}
                                                title="Add task"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Entry Rows */}
                            {dayEntries.length > 0 ? (
                                <div className="divide-y divide-border/30">
                                    {dayEntries.map((entry) => {
                                        const projectTasks = getTasksForProject(entry.projectId)
                                        const taskName = tasks.find(t => t.id === entry.taskId)?.name

                                        return (
                                            <div key={entry.id} className="grid grid-cols-12 gap-4 items-center px-6 py-3">
                                                {/* Empty date column */}
                                                <div className="col-span-2"></div>

                                                {/* Project */}
                                                <div className="col-span-2">
                                                    <Select value={entry.projectId} disabled>
                                                        <SelectTrigger className="h-9 text-sm">
                                                            <SelectValue>
                                                                {projects.find(p => p.id === entry.projectId)?.name || 'Unknown'}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                    </Select>
                                                </div>

                                                {/* Task Type */}
                                                <div className="col-span-2">
                                                    <Select value={entry.taskId || ''} disabled>
                                                        <SelectTrigger className="h-9 text-sm">
                                                            <SelectValue>
                                                                {taskName || (projectTasks.length > 0 ? 'Select Task' : '—')}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        {projectTasks.length > 0 && (
                                                            <SelectContent>
                                                                {projectTasks.map((task) => (
                                                                    <SelectItem key={task.id} value={task.id}>
                                                                        {task.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        )}
                                                    </Select>
                                                </div>

                                                {/* Description */}
                                                <div className="col-span-3">
                                                    <Input
                                                        value={entry.description || ''}
                                                        placeholder="Task description"
                                                        className="h-9 text-sm"
                                                        disabled
                                                    />
                                                </div>

                                                {/* Hours */}
                                                <div className="col-span-1 text-right">
                                                    <div className="text-sm font-semibold tabular-nums">{entry.hours.toFixed(2)}</div>
                                                </div>

                                                {/* Actions */}
                                                <div className="col-span-2 flex justify-end gap-1">
                                                    {!readOnly && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                onClick={() => onEditEntry(entry)}
                                                                title="Edit entry"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                onClick={() => onDeleteEntry(entry.id)}
                                                                title="Delete entry"
                                                            >
                                                                <Trash className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="py-4 text-center">
                                    <p className="text-sm text-muted-foreground italic">
                                        No activities logged
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            })}

            {/* Load More Button */}
            {hasMore && (
                <div className="flex justify-center pt-4">
                    <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        className="min-w-[200px]"
                    >
                        Load More ({allDaysInMonth.length - visibleDays} days remaining)
                    </Button>
                </div>
            )}
        </div>
    )
}
