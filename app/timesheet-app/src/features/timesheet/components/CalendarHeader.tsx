import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { format } from 'date-fns'
import type { TimesheetStatusType } from '@/shared/types'


interface CalendarHeaderProps {
    currentMonth: Date
    onPrevMonth: () => void
    onNextMonth: () => void
    monthlyTotal?: number
    status?: TimesheetStatusType
    onSubmit?: () => void
    isReadOnly?: boolean
}

export function CalendarHeader({
    currentMonth,
    onPrevMonth,
    onNextMonth,
    monthlyTotal = 0,
    status = 'Draft',
    onSubmit,
    isReadOnly = false,
}: CalendarHeaderProps) {

    const statusColors: Record<string, string> = {
        Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        Approved_By_TeamLead: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
        Approved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        Rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
        Finished: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    }

    const statusLabel = status === 'Draft' ? 'Ready' : status.replace(/_/g, ' ')

    return (
        <div className="flex items-center justify-between w-full">
            {/* Left: Title + Month Nav */}
            <div className="flex items-center gap-6">
                <h1 className="text-xl font-bold">Timesheet</h1>

                <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-1 py-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold px-3 min-w-[140px] text-center">
                        {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Right: Month Total + Status + Submit */}
            <div className="flex items-center gap-4">
                {/* Month Total */}
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg px-4 py-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Month Total
                    </span>
                    <span className="text-2xl font-bold text-blue-600 tabular-nums">
                        {monthlyTotal.toFixed(2)}
                    </span>
                    <span className="text-xs font-medium text-blue-600 uppercase">HRS</span>
                </div>

                {/* Status + Submit */}
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                            Status
                        </div>
                        <Badge className={statusColors[status] || statusColors.Draft} variant="secondary">
                            {statusLabel}
                        </Badge>
                    </div>

                    {isReadOnly ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm px-3 py-2 border rounded-lg">
                            <Lock className="h-3.5 w-3.5" />
                            <span>Locked</span>
                        </div>
                    ) : (
                        <Button
                            onClick={onSubmit}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6"
                            disabled={status !== 'Draft'}
                        >
                            Submit
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
