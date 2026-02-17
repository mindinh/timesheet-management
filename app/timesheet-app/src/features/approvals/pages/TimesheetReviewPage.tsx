import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Check, X, Send, MessageSquare, User as UserIcon, Calendar } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useApprovalStore } from '@/features/approvals/store/approvalStore'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import { cn } from '@/shared/lib/utils'

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function TimesheetReviewPage() {
    const { timesheetId } = useParams<{ timesheetId: string }>()
    const navigate = useNavigate()
    const { currentUser, fetchCurrentUser } = useTimesheetStore()
    const {
        selectedTimesheet: ts,
        isDetailLoading,
        modifiedHours,
        comment,
        admins,
        setModifiedHours,
        setComment,
        fetchTimesheetDetail,
        approveTimesheet,
        rejectTimesheet,
        submitToAdmin,
        fetchAdmins,
    } = useApprovalStore()

    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [showAdminDialog, setShowAdminDialog] = useState(false)
    const [selectedAdminId, setSelectedAdminId] = useState('')

    useEffect(() => {
        if (!currentUser) fetchCurrentUser()
    }, [currentUser, fetchCurrentUser])

    useEffect(() => {
        if (timesheetId) {
            fetchTimesheetDetail(timesheetId)
            fetchAdmins()
        }
    }, [timesheetId, fetchTimesheetDetail, fetchAdmins])

    // Computed stats
    const totalSubmitted = useMemo(() => {
        if (!ts?.entries) return 0
        return ts.entries.reduce((sum, e) => sum + e.hours, 0)
    }, [ts?.entries])

    const totalModified = useMemo(() => {
        if (!ts?.entries) return 0
        return ts.entries.reduce((sum, e) => sum + (modifiedHours[e.id] ?? e.hours), 0)
    }, [ts?.entries, modifiedHours])

    const variance = totalModified - totalSubmitted
    const variancePercent = totalSubmitted > 0 ? ((variance / totalSubmitted) * 100).toFixed(1) : '0.0'

    const isApprover = currentUser && ts && ts.currentApprover?.id === currentUser.id
    const isTeamLead = currentUser?.role === 'TeamLead'

    const handleApprove = async () => {
        if (!timesheetId) return
        setActionLoading('approve')
        try {
            await approveTimesheet(timesheetId)
            navigate('/approvals')
        } catch (err) {
            console.error(err)
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async () => {
        if (!timesheetId || !comment.trim()) {
            alert('Please provide a reason for rejection in the notes section.')
            return
        }
        setActionLoading('reject')
        try {
            await rejectTimesheet(timesheetId)
            navigate('/approvals')
        } catch (err) {
            console.error(err)
        } finally {
            setActionLoading(null)
        }
    }

    const handleSubmitToAdmin = async () => {
        if (!timesheetId || !selectedAdminId) return
        setActionLoading('submitToAdmin')
        try {
            await submitToAdmin(timesheetId, selectedAdminId)
            navigate('/approvals')
        } catch (err) {
            console.error(err)
        } finally {
            setActionLoading(null)
            setShowAdminDialog(false)
        }
    }

    if (isDetailLoading || !ts) {
        return (
            <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
                <div className="text-muted-foreground">Loading timesheet...</div>
            </div>
        )
    }

    const periodLabel = `${MONTH_NAMES[ts.month]} ${ts.year}`

    return (
        <div className="max-w-5xl mx-auto pb-32">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <button onClick={() => navigate('/approvals')} className="hover:text-foreground transition-colors">
                    Approvals
                </button>
                <span>/</span>
                <span className="text-foreground">{ts.user?.firstName} {ts.user?.lastName} - {periodLabel}</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Review & Approve Timesheet</h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <UserIcon className="h-4 w-4" />
                            {ts.user?.firstName} {ts.user?.lastName}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            {periodLabel}
                        </span>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/approvals')}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-card border border-border rounded-xl p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Submitted</p>
                    <p className="text-3xl font-bold text-foreground">{totalSubmitted.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">hours</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Modified Hours</p>
                    <p className={cn(
                        'text-3xl font-bold',
                        variance !== 0 ? 'text-[color:var(--sap-informative)]' : 'text-foreground'
                    )}>
                        {totalModified.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {variance !== 0 && (
                            <span className={cn(
                                variance < 0 ? 'text-[color:var(--sap-negative)]' : 'text-[color:var(--sap-positive)]'
                            )}>
                                {variance > 0 ? '↗' : '↘'} {variancePercent}% change
                            </span>
                        )}
                        {variance === 0 && 'hours'}
                    </p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Variance</p>
                    <p className={cn(
                        'text-3xl font-bold',
                        variance < 0 ? 'text-[color:var(--sap-negative)]' : variance > 0 ? 'text-[color:var(--sap-positive)]' : 'text-foreground'
                    )}>
                        {variance >= 0 ? '+' : ''}{variance.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">hours</p>
                </div>
            </div>

            {/* Entry Details Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="font-semibold text-foreground">Daily Entry Details</h2>
                    <span className={cn(
                        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
                        ts.status === 'Submitted' ? 'bg-[color:var(--sap-informative)]/10 text-[color:var(--sap-informative)] border-[color:var(--sap-informative)]/20'
                            : ts.status === 'Approved' ? 'bg-[color:var(--sap-positive)]/10 text-[color:var(--sap-positive)] border-[color:var(--sap-positive)]/20'
                                : 'bg-muted text-muted-foreground border-border'
                    )}>
                        {ts.status === 'Submitted' ? 'Pending Approval' : ts.status}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                                <th className="text-left py-3 px-6">Date</th>
                                <th className="text-left py-3 px-4">Project / Task</th>
                                <th className="text-center py-3 px-4">Submitted</th>
                                <th className="text-center py-3 px-4">Modified Hours</th>
                                <th className="text-center py-3 px-4">Variance</th>
                                <th className="text-center py-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ts.entries
                                .sort((a, b) => a.date.localeCompare(b.date))
                                .map(entry => {
                                    const entryDate = parseISO(entry.date)
                                    const dayName = DAY_NAMES[entryDate.getDay()]
                                    const dateLabel = format(entryDate, 'MMM d, yyyy')
                                    const modified = modifiedHours[entry.id] ?? entry.hours
                                    const entryVariance = modified - entry.hours
                                    const isModified = entryVariance !== 0

                                    return (
                                        <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-6">
                                                <div className="text-sm font-medium">{dateLabel}</div>
                                                <div className="text-xs text-muted-foreground">{dayName}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="text-sm font-medium">{entry.projectName || '—'}</div>
                                                <div className="text-xs text-muted-foreground">{entry.taskName || entry.description || ''}</div>
                                            </td>
                                            <td className="py-3 px-4 text-center text-sm">{entry.hours.toFixed(2)}</td>
                                            <td className="py-3 px-4 text-center">
                                                {isApprover && (ts.status === 'Submitted' || ts.status === 'Approved') ? (
                                                    <input
                                                        type="number"
                                                        step="0.25"
                                                        min="0"
                                                        max="24"
                                                        value={modified}
                                                        onChange={(e) => setModifiedHours(entry.id, parseFloat(e.target.value) || 0)}
                                                        className={cn(
                                                            'w-20 text-center rounded-md border px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20',
                                                            isModified
                                                                ? 'border-[color:var(--sap-informative)] text-[color:var(--sap-informative)] bg-[color:var(--sap-informative)]/5'
                                                                : 'border-border bg-background'
                                                        )}
                                                    />
                                                ) : (
                                                    <span className={cn(
                                                        'text-sm font-medium',
                                                        isModified ? 'text-[color:var(--sap-informative)]' : ''
                                                    )}>
                                                        {modified.toFixed(2)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={cn(
                                                'py-3 px-4 text-center text-sm font-medium',
                                                entryVariance < 0 ? 'text-[color:var(--sap-negative)]' : entryVariance > 0 ? 'text-[color:var(--sap-positive)]' : 'text-muted-foreground'
                                            )}>
                                                {entryVariance >= 0 ? '+' : ''}{entryVariance.toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {isModified ? (
                                                    <Send className="h-4 w-4 mx-auto text-[color:var(--sap-informative)]" />
                                                ) : (
                                                    <Check className="h-4 w-4 mx-auto text-[color:var(--sap-positive)]" />
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                        </tbody>
                        {/* Totals row */}
                        <tfoot>
                            <tr className="border-t-2 border-border font-semibold">
                                <td colSpan={2} className="py-3 px-6 text-sm text-right uppercase tracking-wide">Total Period Hours</td>
                                <td className="py-3 px-4 text-center text-sm">{totalSubmitted.toFixed(2)}</td>
                                <td className={cn(
                                    'py-3 px-4 text-center text-sm',
                                    variance !== 0 ? 'text-[color:var(--sap-informative)]' : ''
                                )}>
                                    {totalModified.toFixed(2)}
                                </td>
                                <td className={cn(
                                    'py-3 px-4 text-center text-sm',
                                    variance < 0 ? 'text-[color:var(--sap-negative)]' : variance > 0 ? 'text-[color:var(--sap-positive)]' : ''
                                )}>
                                    {variance >= 0 ? '+' : ''}{variance.toFixed(2)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Notes Section */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-foreground">Manager Notes & Feedback</h2>
                </div>
                {isApprover && (ts.status === 'Submitted' || ts.status === 'Approved') ? (
                    <textarea
                        className="w-full border border-border rounded-lg p-3 text-sm bg-background resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Add notes about this timesheet review..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                    />
                ) : (
                    <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
                        {comment || 'No notes provided.'}
                    </div>
                )}
            </div>

            {/* Action Bar */}
            {isApprover && (ts.status === 'Submitted' || ts.status === 'Approved') && (
                <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
                    <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="inline-block w-4 h-4 rounded-full bg-[color:var(--sap-informative)]/20 flex items-center justify-center text-xs">ℹ</span>
                            Actions here will notify the employee via email.
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="border-[color:var(--sap-negative)] text-[color:var(--sap-negative)] hover:bg-[color:var(--sap-negative)]/10"
                                onClick={handleReject}
                                disabled={actionLoading !== null}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                            </Button>
                            <Button
                                className="bg-[color:var(--sap-positive)] hover:bg-[color:var(--sap-positive)]/90 text-white"
                                onClick={handleApprove}
                                disabled={actionLoading !== null}
                            >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                            </Button>
                            {isTeamLead && ts.status === 'Approved' && (
                                <Button
                                    className="bg-primary hover:bg-primary/90"
                                    onClick={() => setShowAdminDialog(true)}
                                    disabled={actionLoading !== null}
                                >
                                    <Send className="h-4 w-4 mr-1" />
                                    Submit to Final Admin
                                </Button>
                            )}
                            {/* Team Lead can also submit to admin right after approve */}
                            {isTeamLead && ts.status === 'Submitted' && (
                                <Button
                                    variant="default"
                                    onClick={() => setShowAdminDialog(true)}
                                    disabled={actionLoading !== null}
                                >
                                    <Send className="h-4 w-4 mr-1" />
                                    Submit to Final Admin
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Submit to Admin Dialog */}
            {showAdminDialog && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center" onClick={() => setShowAdminDialog(false)}>
                    <div className="bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4">Select Final Admin</h3>
                        <p className="text-sm text-muted-foreground mb-4">Choose an admin to forward this timesheet for final approval.</p>
                        <select
                            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mb-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={selectedAdminId}
                            onChange={(e) => setSelectedAdminId(e.target.value)}
                        >
                            <option value="">Select an admin...</option>
                            {admins.map(admin => (
                                <option key={admin.id} value={admin.id}>
                                    {admin.firstName} {admin.lastName} ({admin.role})
                                </option>
                            ))}
                        </select>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowAdminDialog(false)}>Cancel</Button>
                            <Button
                                onClick={handleSubmitToAdmin}
                                disabled={!selectedAdminId || actionLoading !== null}
                            >
                                {actionLoading === 'submitToAdmin' ? 'Submitting...' : 'Submit'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
