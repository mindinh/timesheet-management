import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { History, CheckCircle2, XCircle, Send, RotateCcw, Flag, MessageSquare } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/shared/components/ui/dialog'
import { cn } from '@/shared/lib/utils'
import type { ApprovalHistory } from '@/shared/types'

interface AuditHistoryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    history: ApprovalHistory[]
    periodLabel: string
    userName?: string
}

const ACTION_CONFIG: Record<string, {
    icon: typeof CheckCircle2
    color: string
    bgColor: string
    borderColor: string
    label: string
}> = {
    Submitted: {
        icon: Send,
        color: 'text-sap-informative',
        bgColor: 'bg-sap-informative/10',
        borderColor: 'border-sap-informative/30',
        label: 'Submitted',
    },
    Approved: {
        icon: CheckCircle2,
        color: 'text-sap-positive',
        bgColor: 'bg-sap-positive/10',
        borderColor: 'border-sap-positive/30',
        label: 'Approved',
    },
    Rejected: {
        icon: XCircle,
        color: 'text-sap-negative',
        bgColor: 'bg-sap-negative/10',
        borderColor: 'border-sap-negative/30',
        label: 'Rejected',
    },
    Modified: {
        icon: RotateCcw,
        color: 'text-sap-critical',
        bgColor: 'bg-sap-critical/10',
        borderColor: 'border-sap-critical/30',
        label: 'Modified',
    },
    Finished: {
        icon: Flag,
        color: 'text-sap-positive',
        bgColor: 'bg-sap-positive/10',
        borderColor: 'border-sap-positive/30',
        label: 'Finished',
    },
}

const DEFAULT_CONFIG = {
    icon: MessageSquare,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-border',
    label: 'Action',
}

const FILTER_OPTIONS = ['All', 'Submitted', 'Approved', 'Rejected', 'Modified', 'Finished'] as const

export function AuditHistoryDialog({
    open,
    onOpenChange,
    history,
    periodLabel,
    userName,
}: AuditHistoryDialogProps) {
    const [filterAction, setFilterAction] = useState<string>('All')

    const sortedHistory = useMemo(() => {
        let items = [...history].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        if (filterAction !== 'All') {
            items = items.filter(h => h.action === filterAction)
        }
        return items
    }, [history, filterAction])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-sap-informative/10">
                            <History className="h-5 w-5 text-sap-informative" />
                        </div>
                        <div>
                            <DialogTitle>Audit History</DialogTitle>
                            <DialogDescription>
                                Activity log{userName ? ` for ${userName}` : ''} · {periodLabel}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Filter */}
                <div className="flex items-center justify-between border-b pb-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {sortedHistory.length} event{sortedHistory.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex gap-1">
                        {FILTER_OPTIONS.map(opt => (
                            <button
                                key={opt}
                                onClick={() => setFilterAction(opt)}
                                className={cn(
                                    'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                                    filterAction === opt
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted'
                                )}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto pr-1 -mr-1">
                    {sortedHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <History className="h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">No activity recorded yet</p>
                        </div>
                    ) : (
                        <div className="relative pl-8 py-2">
                            {/* Vertical timeline line */}
                            <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />

                            {sortedHistory.map((event, i) => {
                                const config = ACTION_CONFIG[event.action] || DEFAULT_CONFIG
                                const Icon = config.icon
                                const ts = event.timestamp ? parseISO(event.timestamp) : null
                                const actorName = event.actor
                                    ? `${event.actor.firstName} ${event.actor.lastName}`
                                    : 'System'
                                const actorRole = event.actor?.role || ''

                                return (
                                    <div key={event.id || i} className="relative mb-6 last:mb-0">
                                        {/* Timeline dot */}
                                        <div className={cn(
                                            'absolute -left-8 top-1 flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 bg-card',
                                            config.borderColor
                                        )}>
                                            <Icon className={cn('h-3.5 w-3.5', config.color)} />
                                        </div>

                                        {/* Content card */}
                                        <div className="bg-card border border-border rounded-lg p-4 ml-1">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {config.label}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {actorRole && <span className="capitalize">{actorRole}</span>}
                                                        {actorRole && ' · '}
                                                        <span className="font-medium text-foreground/80">{actorName}</span>
                                                    </p>
                                                </div>
                                                {ts && (
                                                    <div className="text-right shrink-0">
                                                        <p className="text-xs font-medium text-foreground">
                                                            {format(ts, 'MMM d, yyyy')}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(ts, 'hh:mm a')}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status transition */}
                                            {event.fromStatus && event.toStatus && (
                                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                                    <span className="px-1.5 py-0.5 rounded bg-muted">
                                                        {event.fromStatus.replace(/_/g, ' ')}
                                                    </span>
                                                    <span>→</span>
                                                    <span className={cn('px-1.5 py-0.5 rounded', config.bgColor, config.color)}>
                                                        {event.toStatus.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Comment */}
                                            {event.comment && (
                                                <div className={cn(
                                                    'mt-3 rounded-md px-3 py-2 text-sm border',
                                                    event.action === 'Rejected'
                                                        ? 'bg-sap-negative/5 border-sap-negative/20 text-sap-negative'
                                                        : 'bg-muted/30 border-border text-muted-foreground'
                                                )}>
                                                    <p className="italic">"{event.comment}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
