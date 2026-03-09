import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { History, CheckCircle2, XCircle, Send, RotateCcw, Flag, MessageSquare, User, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { cn } from '@/shared/lib/utils';
import type { ApprovalHistory } from '@/shared/types';

interface AuditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: ApprovalHistory[];
  periodLabel: string;
  userName?: string;
}

const ACTION_CONFIG: Record<
  string,
  {
    icon: typeof CheckCircle2;
    color: string;
    bgColor: string;
    dotColor: string;
    label: string;
  }
> = {
  Submitted: {
    icon: Send,
    color: 'text-info',
    bgColor: 'bg-info-bg',
    dotColor: 'bg-info',
    label: 'Submitted',
  },
  Approved: {
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success-bg',
    dotColor: 'bg-success',
    label: 'Approved',
  },
  Reopened: {
    icon: XCircle,
    color: 'text-error',
    bgColor: 'bg-error-bg',
    dotColor: 'bg-error',
    label: 'Reopened for Edit',
  },
  Modified: {
    icon: RotateCcw,
    color: 'text-warning',
    bgColor: 'bg-warning-bg',
    dotColor: 'bg-warning',
    label: 'Modified',
  },
  Finished: {
    icon: Flag,
    color: 'text-success',
    bgColor: 'bg-success-bg',
    dotColor: 'bg-success',
    label: 'Finished',
  },
  SubmittedToAdmin: {
    icon: Send,
    color: 'text-status-sent-text',
    bgColor: 'bg-status-sent',
    dotColor: 'bg-status-sent-text',
    label: 'Forwarded to Admin',
  },
};

const DEFAULT_CONFIG = {
  icon: MessageSquare,
  color: 'text-muted-foreground',
  bgColor: 'bg-muted',
  dotColor: 'bg-muted-foreground',
  label: 'Action',
};

const FILTER_OPTIONS = ['All', 'Submitted', 'Approved', 'Reopened', 'Modified', 'Finished'] as const;

export function AuditHistoryDialog({ open, onOpenChange, history, periodLabel, userName }: AuditHistoryDialogProps) {
  const [filterAction, setFilterAction] = useState<string>('All');

  const sortedHistory = useMemo(() => {
    let items = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (filterAction !== 'All') {
      items = items.filter((h) => h.action === filterAction);
    }
    return items;
  }, [history, filterAction]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden flex flex-col max-h-[85vh] gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Audit History</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {userName && <span className="font-medium text-foreground/70">{userName} · </span>}
                {periodLabel}
              </p>
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setFilterAction(opt)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full border transition-all',
                  filterAction === opt
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                )}
              >
                {opt}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground flex items-center">
              {sortedHistory.length} event{sortedHistory.length !== 1 ? 's' : ''}
            </span>
          </div>
        </DialogHeader>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto">
          {sortedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <History className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No activity recorded</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Events will appear here after actions are taken</p>
            </div>
          ) : (
            <div className="px-6 py-4 space-y-0">
              {sortedHistory.map((event, i) => {
                const config = ACTION_CONFIG[event.action] || DEFAULT_CONFIG;
                const Icon = config.icon;
                const ts = event.timestamp ? parseISO(event.timestamp) : null;
                const actorName = event.actor ? `${event.actor.firstName} ${event.actor.lastName}` : 'System';
                const actorRole = event.actor?.role || '';
                const isLast = i === sortedHistory.length - 1;

                return (
                  <div key={event.id || i} className="relative flex gap-4">
                    {/* Left: dot + line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-card ring-2 ring-border bg-card mt-1',
                        )}
                      >
                        <div className={cn('h-2.5 w-2.5 rounded-full', config.dotColor)} />
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-1" />}
                    </div>

                    {/* Right: content */}
                    <div className={cn('flex-1 pb-5', isLast && 'pb-4')}>
                      {/* Action + timestamp row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className={cn('p-1.5 rounded-md', config.bgColor)}>
                            <Icon className={cn('h-3.5 w-3.5', config.color)} />
                          </div>
                          <span className="text-sm font-semibold text-foreground">{config.label}</span>
                        </div>
                        {ts && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                            <Clock className="h-3 w-3" />
                            <span>{format(ts, 'MMM d · h:mm a')}</span>
                          </div>
                        )}
                      </div>

                      {/* Actor */}
                      <div className="flex items-center gap-1.5 mt-1.5 ml-9">
                        <User className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-xs text-muted-foreground">
                          {actorRole && (
                            <span className="capitalize font-medium text-foreground/60">{actorRole} · </span>
                          )}
                          <span className="font-medium text-foreground/80">{actorName}</span>
                        </span>
                      </div>

                      {/* Status transition pills */}
                      {event.fromStatus && event.toStatus && event.fromStatus !== event.toStatus && (
                        <div className="flex items-center gap-2 mt-2 ml-9">
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground border border-border">
                            {event.fromStatus.replace(/_/g, ' ')}
                          </span>
                          <span className="text-muted-foreground/50 text-xs">→</span>
                          <span className={cn('px-2 py-0.5 text-[10px] font-semibold rounded-full border', config.bgColor, config.color, 'border-current/20')}>
                            {event.toStatus.replace(/_/g, ' ')}
                          </span>
                        </div>
                      )}

                      {/* Comment */}
                      {event.comment && (
                        <div
                          className={cn(
                            'mt-2.5 ml-9 rounded-lg px-3 py-2 text-xs border',
                            event.action === 'Reopened'
                              ? 'bg-error-bg border-error/30 text-error'
                              : 'bg-muted/60 border-border text-muted-foreground',
                          )}
                        >
                          <MessageSquare className="h-3 w-3 inline mr-1.5 opacity-60" />
                          {event.comment}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
