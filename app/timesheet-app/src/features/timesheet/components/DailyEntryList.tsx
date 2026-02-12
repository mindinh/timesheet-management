import { useState, useMemo } from 'react'
import { format, isToday, isYesterday, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns'
import { Copy, Plus, Trash, Pencil } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Select, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Input } from '@/shared/components/ui/input'
import type { TimesheetEntry, Project } from '@/shared/types'


interface DailyEntryListProps {
    currentMonth: Date
    entries: TimesheetEntry[]
    projects: Project[]
    onAddEntry: (date: string) => void
    onDuplicateDay?: (date: string) => void
    onEditEntry: (entry: TimesheetEntry) => void
    onDeleteEntry: (entryId: string) => void
}

const INITIAL_DAYS_TO_SHOW = 5

export function DailyEntryList({
    currentMonth,
    entries,
    projects,
    onAddEntry,
    onDuplicateDay,
    onEditEntry,
    onDeleteEntry,
}: DailyEntryListProps) {
    const [visibleDays, setVisibleDays] = useState(INITIAL_DAYS_TO_SHOW)

    // Generate all days in the current month
    const allDaysInMonth = useMemo(() => {
        const start = startOfMonth(currentMonth)
        const end = endOfMonth(currentMonth)
        const days = eachDayOfInterval({ start, end })
        // Sort in descending order (newest first)
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


    const visibleDaysList = allDaysInMonth.slice(0, visibleDays)
    const hasMore = visibleDays < allDaysInMonth.length

    return (
        <div className="space-y-6">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground uppercase px-4">
                <div className="col-span-2">Date / Status</div>
                <div className="col-span-3">Project</div>
                <div className="col-span-4">Task Description</div>
                <div className="col-span-2">HRS</div>
                <div className="col-span-1">Action</div>
            </div>

            {/* Daily Entries - All Days */}
            {visibleDaysList.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayEntries = groupedEntries[dateStr] || []
                const dailyTotal = getDailyTotal(dateStr)
                const dateLabel = getDateLabel(day)
                const isWeekendDay = isWeekend(day)

                return (
                    <Card key={dateStr} className={`border-0 shadow-sm ${isWeekendDay ? 'bg-muted/30' : ''}`}>
                        <CardContent className="p-6 space-y-4">
                            {/* Date Header */}
                            <div className="flex items-center justify-between pb-2 border-b">
                                <div>
                                    <div className="text-sm font-semibold">
                                        {format(day, 'MMM dd, EEE')}
                                    </div>
                                    <div className={`text-xs font-medium ${isWeekendDay ? 'text-muted-foreground' : 'text-blue-600'}`}>
                                        {dateLabel}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-lg font-bold text-blue-600">
                                        {dailyTotal}
                                    </div>
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
                                        className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700"
                                        onClick={() => onAddEntry(dateStr)}
                                        title="Add task"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Entry Rows */}
                            {dayEntries.length > 0 ? (
                                <div className="space-y-3">
                                    {dayEntries.map((entry) => (
                                        <div key={entry.id} className="grid grid-cols-12 gap-4 items-center">
                                            <div className="col-span-2"></div>
                                            <div className="col-span-3">
                                                <Select value={entry.projectId} disabled>
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue>
                                                            {projects.find(p => p.id === entry.projectId)?.name || 'Unknown'}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                </Select>
                                            </div>
                                            <div className="col-span-4">
                                                <Input
                                                    value={entry.description || ''}
                                                    placeholder="Task description"
                                                    className="h-9"
                                                    disabled
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <div className="text-sm font-medium">{entry.hours.toFixed(2)}</div>
                                            </div>
                                            <div className="col-span-1 flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                                                    onClick={() => onEditEntry(entry)}
                                                    title="Edit entry"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => onDeleteEntry(entry.id)}
                                                    title="Delete entry"
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-4 text-center">
                                    <p className="text-sm text-muted-foreground italic">
                                        No activities logged for this day
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
