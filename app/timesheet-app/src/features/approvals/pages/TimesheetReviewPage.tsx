import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Check, X, Send, MessageSquare, User as UserIcon, Calendar, Pencil, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table'
import { Textarea } from '@/shared/components/ui/textarea'
import { useApprovalStore } from '@/features/approvals/store/approvalStore'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import { adminModifyEntryHours } from '@/features/admin/api/admin-api'
import { cn } from '@/shared/lib/utils'
import StatusDialog from '@/shared/components/common/StatusDialog'

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

    // Admin Override State
    const [overrideModal, setOverrideModal] = useState<{ open: boolean, entryId: string, hours: number, note: string }>({
        open: false, entryId: '', hours: 0, note: ''
    })
    const [isOverriding, setIsOverriding] = useState(false)

    const [statusDialog, setStatusDialog] = useState<{ open: boolean; variant: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }>({
        open: false, variant: 'info', title: ''
    })

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
            setStatusDialog({ open: true, variant: 'warning', title: 'Comment Required', description: 'Please provide a reason for rejection in the notes section.' })
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

    const handleAdminOverrideSubmit = async () => {
        if (!overrideModal.entryId) return
        setIsOverriding(true)
        try {
            const msg = await adminModifyEntryHours(overrideModal.entryId, overrideModal.hours, overrideModal.note)
            setStatusDialog({ open: true, variant: 'success', title: 'Success', description: msg })
            setOverrideModal({ open: false, entryId: '', hours: 0, note: '' })
            // Refresh to see the new hours
            if (timesheetId) {
                fetchTimesheetDetail(timesheetId)
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'An error occurred during Admin Override.'
            setStatusDialog({ open: true, variant: 'error', title: 'Override Failed', description: msg })
        } finally {
            setIsOverriding(false)
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
                        variance !== 0 ? 'text-sap-informative' : 'text-foreground'
                    )}>
                        {totalModified.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {variance !== 0 && (
                            <span className={cn(
                                variance < 0 ? 'text-sap-negative' : 'text-sap-positive'
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
                        variance < 0 ? 'text-sap-negative' : variance > 0 ? 'text-sap-positive' : 'text-foreground'
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
                        ts.status === 'Submitted' ? 'bg-sap-informative/10 text-sap-informative border-sap-informative/20'
                            : ts.status === 'Approved' ? 'bg-sap-positive/10 text-sap-positive border-sap-positive/20'
                                : 'bg-muted text-muted-foreground border-border'
                    )}>
                        {ts.status === 'Submitted' ? 'Pending Approval' : ts.status}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="w-[120px]">Date</TableHead>
                                <TableHead>Project / Task</TableHead>
                                <TableHead className="text-center w-[100px]">Submitted</TableHead>
                                <TableHead className="text-center w-[120px]">Modified Hours</TableHead>
                                <TableHead className="text-center w-[100px]">Variance</TableHead>
                                <TableHead className="text-center w-[80px]">Status</TableHead>
                                {currentUser?.role === 'Admin' && (
                                    <TableHead className="text-right w-[80px]">Override</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
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
                                        <TableRow key={entry.id} className="group hover:bg-muted/20">
                                            <TableCell>
                                                <div className="font-medium">{dateLabel}</div>
                                                <div className="text-xs text-muted-foreground">{dayName}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-foreground">{entry.projectName || '—'}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{entry.taskName || entry.description || ''}</div>
                                            </TableCell>
                                            <TableCell className="text-center font-mono">
                                                {entry.hours.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {isApprover && (ts.status === 'Submitted' || ts.status === 'Approved') ? (
                                                    <Input
                                                        type="number"
                                                        step="0.25"
                                                        min="0"
                                                        max="24"
                                                        value={modified}
                                                        onChange={(e) => setModifiedHours(entry.id, parseFloat(e.target.value) || 0)}
                                                        className={cn(
                                                            'w-20 mx-auto text-center h-8 font-mono',
                                                            isModified ? 'border-sap-informative text-sap-informative bg-sap-informative/5 focus-visible:ring-sap-informative' : ''
                                                        )}
                                                    />
                                                ) : (
                                                    <span className={cn(
                                                        'font-mono text-sm',
                                                        isModified ? 'text-sap-informative font-medium bg-sap-informative/10 px-2 py-0.5 rounded' : ''
                                                    )}>
                                                        {modified.toFixed(2)}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={cn(
                                                    'font-mono text-sm',
                                                    entryVariance < 0 ? 'text-sap-negative' : entryVariance > 0 ? 'text-sap-positive' : 'text-muted-foreground'
                                                )}>
                                                    {entryVariance > 0 ? '+' : ''}{entryVariance !== 0 ? entryVariance.toFixed(2) : '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {isModified ? (
                                                    <Send className="h-4 w-4 mx-auto text-sap-informative" />
                                                ) : (
                                                    <Check className="h-4 w-4 mx-auto text-sap-positive" />
                                                )}
                                            </TableCell>

                                            {currentUser?.role === 'Admin' && (
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => setOverrideModal({
                                                            open: true,
                                                            entryId: entry.id,
                                                            hours: modified,
                                                            note: ''
                                                        })}
                                                    >
                                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    )
                                })}
                        </TableBody>
                        <tfoot className="bg-muted/50 border-t border-border">
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={2} className="text-right font-medium uppercase text-xs tracking-wider text-muted-foreground">
                                    Total Period Hours
                                </TableCell>
                                <TableCell className="text-center font-bold font-mono">
                                    {totalSubmitted.toFixed(2)}
                                </TableCell>
                                <TableCell className={cn(
                                    'text-center font-bold font-mono',
                                    variance !== 0 ? 'text-sap-informative' : ''
                                )}>
                                    {totalModified.toFixed(2)}
                                </TableCell>
                                <TableCell className={cn(
                                    'text-center font-bold font-mono',
                                    variance < 0 ? 'text-sap-negative' : variance > 0 ? 'text-sap-positive' : 'text-muted-foreground'
                                )}>
                                    {variance > 0 ? '+' : ''}{variance !== 0 ? variance.toFixed(2) : '-'}
                                </TableCell>
                                <TableCell></TableCell>
                                {currentUser?.role === 'Admin' && <TableCell></TableCell>}
                            </TableRow>
                        </tfoot>
                    </Table>
                </div>
            </div>

            {/* Notes Section */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-foreground">Manager Notes & Feedback</h2>
                </div>
                {isApprover && (ts.status === 'Submitted' || ts.status === 'Approved') ? (
                    <Textarea
                        className="w-full min-h-[100px] resize-y"
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
                            <span className="inline-block w-4 h-4 rounded-full bg-sap-informative/20 flex items-center justify-center text-xs">ℹ</span>
                            Actions here will notify the employee via email.
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="border-sap-negative text-sap-negative hover:bg-sap-negative/10"
                                onClick={handleReject}
                                disabled={actionLoading !== null}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                            </Button>
                            <Button
                                className="bg-sap-positive hover:bg-sap-positive/90 text-white"
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
                        <Select
                            value={selectedAdminId}
                            onValueChange={(value) => setSelectedAdminId(value)}
                        >
                            <SelectTrigger className="w-full mb-6">
                                <SelectValue placeholder="Select an admin..." />
                            </SelectTrigger>
                            <SelectContent>
                                {admins.map((admin: { id: string, firstName: string, lastName: string, role: string }) => (
                                    <SelectItem key={admin.id} value={admin.id}>
                                        {admin.firstName} {admin.lastName} ({admin.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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

            {/* Admin Override Modal */}
            <Dialog open={overrideModal.open} onOpenChange={(open) => !isOverriding && setOverrideModal(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Admin Hours Override</DialogTitle>
                        <DialogDescription>
                            Directly modify the approved hours for this specific entry. This will be logged in the system audit trail.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Approved Hours</Label>
                            <Input
                                type="number"
                                step="0.25"
                                min="0"
                                max="24"
                                value={overrideModal.hours}
                                onChange={(e) => setOverrideModal(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Override Note (Reason)</Label>
                            <Input
                                placeholder="e.g., Client approved 1 extra hour..."
                                value={overrideModal.note}
                                onChange={(e) => setOverrideModal(prev => ({ ...prev, note: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOverrideModal(prev => ({ ...prev, open: false }))} disabled={isOverriding}>
                            Cancel
                        </Button>
                        <Button onClick={handleAdminOverrideSubmit} disabled={isOverriding}>
                            {isOverriding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Status Dialog */}
            <StatusDialog
                open={statusDialog.open}
                onOpenChange={(open) => setStatusDialog(prev => ({ ...prev, open }))}
                variant={statusDialog.variant}
                title={statusDialog.title}
                description={statusDialog.description}
            />
        </div>
    )
}
