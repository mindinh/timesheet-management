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
    onSubmit?: (approverId?: string) => void
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
        Draft: 'bg-muted text-muted-foreground',
        Submitted: 'bg-sap-informative/10 text-sap-informative',
        Approved_By_TeamLead: 'bg-sap-positive/10 text-sap-positive',
        Approved: 'bg-sap-positive/10 text-sap-positive',
        Rejected: 'bg-sap-negative/10 text-sap-negative',
        Finished: 'bg-sap-positive/10 text-sap-positive',
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
                <div className="flex items-center gap-2 bg-sap-informative/10 rounded-lg px-4 py-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Month Total
                    </span>
                    <span className="text-2xl font-bold text-sap-informative tabular-nums">
                        {monthlyTotal.toFixed(2)}
                    </span>
                    <span className="text-xs font-medium text-sap-informative uppercase">HRS</span>
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
                            onClick={() => { }}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
                            disabled={status !== 'Draft' && status !== 'Rejected'}
                        >
                            {status === 'Rejected' ? 'Resubmit' : 'Submit'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
