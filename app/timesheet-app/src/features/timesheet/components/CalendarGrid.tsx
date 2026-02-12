import { useMemo } from 'react'
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    format,
} from 'date-fns'
import { cn } from '@/shared/lib/utils'
import type { TimesheetEntry } from '@/shared/types'

interface CalendarGridProps {
    currentMonth: Date
    entries: TimesheetEntry[]
    onDayClick: (date: Date) => void
}

export function CalendarGrid({ currentMonth, entries, onDayClick }: CalendarGridProps) {
    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth))
        const end = endOfWeek(endOfMonth(currentMonth))
        return eachDayOfInterval({ start, end })
    }, [currentMonth])

    const getDailyTotal = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        return entries
            .filter((e) => e.date === dateStr)
            .reduce((sum, e) => sum + e.hours, 0)
    }

    return (
        <div className="rounded-lg border bg-card">
            <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-sm font-medium text-muted-foreground">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="py-2">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {days.map((day, dayIdx) => {
                    const dailyTotal = getDailyTotal(day)
                    const isCurrentMonth = isSameMonth(day, currentMonth)
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6

                    return (
                        <div
                            key={day.toString()}
                            onClick={() => onDayClick(day)}
                            className={cn(
                                'min-h-[100px] border-b border-r p-2 transition-colors hover:bg-accent/50 cursor-pointer',
                                !isCurrentMonth && 'bg-muted/20 text-muted-foreground',
                                isToday(day) && 'bg-accent/20',
                                (dayIdx + 1) % 7 === 0 && 'border-r-0' // No right border for last col
                            )}
                        >
                            <div className="flex items-start justify-between">
                                <span
                                    className={cn(
                                        'flex h-6 w-6 items-center justify-center rounded-full text-sm',
                                        isToday(day) && 'bg-primary text-primary-foreground font-bold'
                                    )}
                                >
                                    {format(day, 'd')}
                                </span>
                                {dailyTotal > 0 && (
                                    <span
                                        className={cn(
                                            'rounded px-1.5 py-0.5 text-xs font-medium',
                                            dailyTotal >= 8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                                            dailyTotal > 24 && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        )}
                                    >
                                        {dailyTotal}h
                                    </span>
                                )}
                            </div>

                            {/* Optional: Show small dots or indicators for multiple projects */}
                            {!isWeekend && dailyTotal === 0 && isCurrentMonth && day < new Date() && (
                                <div className="mt-4 flex justify-center">
                                    <span className="text-xs text-destructive/50 italic">Missing</span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
