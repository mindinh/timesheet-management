import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { ArrowLeft, CheckCircle, FileText, UserCircle, Calendar, XCircle, Clock, ChevronDown, ChevronRight, History } from 'lucide-react'
import { format } from 'date-fns'
import { fetchTimesheetBatchById, markBatchDoneApi, rejectBatchApi, adminModifyEntryHours, type TimesheetBatchDetail } from '../api/admin-api'
import { getTimesheetDetail, rejectTimesheet } from '@/features/timesheet/api/timesheet-api'
import type { Timesheet, TimesheetEntry } from '@/shared/types'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog'
import { Textarea } from '@/shared/components/ui/textarea'
import { Input } from '@/shared/components/ui/input'
import StatusDialog from '@/shared/components/common/StatusDialog'
import ConfirmDialog from '@/shared/components/common/ConfirmDialog'

export default function AdminBatchDetailPage() {
    const { batchId } = useParams<{ batchId: string }>()
    const navigate = useNavigate()
    const [batch, setBatch] = useState<TimesheetBatchDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Expanded timesheet details
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
    const [timesheetDetails, setTimesheetDetails] = useState<Record<string, Timesheet & { entries: TimesheetEntry[] }>>({})
    const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({})

    // Dialogs
    const [statusDialog, setStatusDialog] = useState<{ open: boolean; variant: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }>({
        open: false, variant: 'info', title: ''
    })
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description?: string; onConfirm: () => void; destructive?: boolean }>({
        open: false, title: '', onConfirm: () => { }
    })

    // Batch Reject Dialog
    const [rejectComment, setRejectComment] = useState('')
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)

    // Single Timesheet Reject Dialog
    const [tsRejectComment, setTsRejectComment] = useState('')
    const [tsRejectId, setTsRejectId] = useState<string | null>(null)

    // Entry Editing State
    const [editingEntry, setEditingEntry] = useState<{ tsId: string; entryId: string; hours: string; note: string } | null>(null)
    const [isSavingEntry, setIsSavingEntry] = useState(false)

    const loadBatch = async () => {
        if (!batchId) return
        setIsLoading(true)
        try {
            const data = await fetchTimesheetBatchById(batchId)
            setBatch(data)
        } catch (error: unknown) {
            console.error('Failed to load batch:', error)
            setStatusDialog({ open: true, variant: 'error', title: 'Error', description: 'Failed to load batch details.' })
        } finally {
            setIsLoading(false)
        }
    }

    const toggleTimesheet = async (tsId: string) => {
        const isCurrentlyExpanded = expandedRows[tsId]
        setExpandedRows(prev => ({ ...prev, [tsId]: !isCurrentlyExpanded }))

        // If we are expanding and don't have the details yet, fetch them
        if (!isCurrentlyExpanded && !timesheetDetails[tsId]) {
            setLoadingDetails(prev => ({ ...prev, [tsId]: true }))
            try {
                const details = await getTimesheetDetail(tsId)
                setTimesheetDetails(prev => ({ ...prev, [tsId]: details }))
            } catch (error) {
                console.error(`Failed to load details for timesheet ${tsId}:`, error)
            } finally {
                setLoadingDetails(prev => ({ ...prev, [tsId]: false }))
            }
        }
    }

    useEffect(() => {
        loadBatch()
    }, [batchId])

    const handleMarkDone = () => {
        setConfirmDialog({
            open: true,
            title: 'Mark Batch as Done',
            description: 'Are you sure you want to finalize this batch? All timesheets within will be marked as Finished and become read-only.',
            onConfirm: async () => {
                try {
                    await markBatchDoneApi(batchId!)
                    setStatusDialog({ open: true, variant: 'success', title: 'Batch Completed', description: 'Batch marked as Done successfully.' })
                    loadBatch()
                } catch (error: unknown) {
                    const msg = error instanceof Error ? error.message : 'Failed to complete batch.'
                    setStatusDialog({ open: true, variant: 'error', title: 'Operation Failed', description: msg })
                }
            }
        })
    }

    const executeReject = async () => {
        if (!rejectComment.trim()) {
            setStatusDialog({ open: true, variant: 'warning', title: 'Validation', description: 'Please provide a reason for rejecting this batch.' })
            return
        }
        setIsRejectDialogOpen(false)
        try {
            await rejectBatchApi(batchId!, rejectComment)
            setStatusDialog({ open: true, variant: 'success', title: 'Batch Rejected', description: 'Batch rejected and returned to submitted state for Team Lead.' })
            setRejectComment('')
            loadBatch()
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Failed to reject batch.'
            setStatusDialog({ open: true, variant: 'error', title: 'Operation Failed', description: msg })
        }
    }

    const executeRejectTimesheet = async () => {
        if (!tsRejectId || !tsRejectComment.trim()) {
            setStatusDialog({ open: true, variant: 'warning', title: 'Validation', description: 'Please provide a reason for rejecting this timesheet.' })
            return
        }
        try {
            await rejectTimesheet(tsRejectId, tsRejectComment)
            setStatusDialog({ open: true, variant: 'success', title: 'Timesheet Rejected', description: 'Timesheet has been rejected individually.' })
            setTsRejectComment('')
            setTsRejectId(null)
            loadBatch() // Refresh batch to see updated timesheet statuses
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Failed to reject timesheet.'
            setStatusDialog({ open: true, variant: 'error', title: 'Operation Failed', description: msg })
        }
    }

    const handleSaveEntryHours = async (tsId: string, entryId: string) => {
        if (!editingEntry) return
        const newHoursNum = parseFloat(editingEntry.hours)
        if (isNaN(newHoursNum) || newHoursNum < 0 || newHoursNum > 24) {
            setStatusDialog({ open: true, variant: 'warning', title: 'Invalid Input', description: 'Hours must be a number between 0 and 24.' })
            return
        }

        setIsSavingEntry(true)
        try {
            await adminModifyEntryHours(entryId, newHoursNum, editingEntry.note.trim() || undefined)
            // Refresh just this timesheet's details rather than entire batch to save bandwidth
            const details = await getTimesheetDetail(tsId)
            setTimesheetDetails(prev => ({ ...prev, [tsId]: details }))
            setEditingEntry(null)
            // We should also theoretically reload the batch if total hours change, but since admin just wants to modify, partial reload is ok.
            // Let's reload batch just to be safe and keep UI in sync (e.g. if we show total batch hours later).
            loadBatch()
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Failed to update hours.'
            setStatusDialog({ open: true, variant: 'error', title: 'Operation Failed', description: msg })
        } finally {
            setIsSavingEntry(false)
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading batch details...</div>
    }

    if (!batch) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => navigate('/admin/batches')} className="pl-0 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Batches
                </Button>
                <div className="p-8 text-center bg-card rounded-xl border border-border shadow-sm">
                    <p className="text-muted-foreground">Batch not found.</p>
                </div>
            </div>
        )
    }

    const { status, teamLead, createdAt, timesheets, history } = batch
    const formattedDate = format(new Date(createdAt), 'MMM dd, yyyy HH:mm')

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <Button variant="ghost" onClick={() => navigate('/admin/batches')} className="pl-0 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Batches
            </Button>

            {/* Header Card */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold tracking-tight text-card-foreground">Batch Details</h1>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                                status === 'Finished' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                    'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                {status === 'Processed' || status === 'Finished' ? 'Finished' : status}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded inline-block">
                            ID: {batchId}
                        </p>
                    </div>

                    {status === 'Pending' && (
                        <div className="flex items-center gap-3">
                            <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setIsRejectDialogOpen(true)}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject Batch
                            </Button>
                            <Button onClick={handleMarkDone} className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Done
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-border/50">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                            <UserCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Submitted By (Team Lead)</p>
                            <p className="font-medium text-foreground">{teamLead.firstName} {teamLead.lastName}</p>
                            <p className="text-sm text-muted-foreground">{teamLead.email}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                            <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Created At</p>
                            <p className="font-medium text-foreground">{formattedDate}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Timesheets</p>
                            <p className="font-medium text-foreground text-xl leading-none">{timesheets.length}</p>
                        </div>
                    </div>
                </div>

                {/* Batch History Timeline */}
                {history && history.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border/50">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                            <History className="h-4 w-4" /> Batch Activity History
                        </h3>
                        <div className="space-y-4">
                            {history.map((log) => (
                                <div key={log.ID} className="flex gap-4">
                                    <div className="relative flex flex-col items-center">
                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0 z-10 border-2 border-background">
                                            {log.actor.firstName[0]}{log.actor.lastName[0]}
                                        </div>
                                        <div className="w-px h-full bg-border absolute top-8 bottom-[-16px] last:hidden"></div>
                                    </div>
                                    <div className="flex-1 pb-4">
                                        <p className="text-sm font-medium text-foreground">
                                            {log.actor.firstName} {log.actor.lastName}
                                            <span className="font-normal text-muted-foreground ml-1">
                                                {log.action === 'Created' ? 'created this batch' :
                                                    log.action === 'Finished' ? 'marked this batch as done' :
                                                        log.action === 'Rejected' ? 'rejected this batch' :
                                                            log.action}
                                            </span>
                                        </p>
                                        {log.comment && (
                                            <p className="text-sm text-muted-foreground mt-1 bg-muted/40 p-2 rounded-md italic">
                                                "{log.comment}"
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground/70 mt-1">
                                            {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Timesheets List */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border bg-muted/20">
                    <h2 className="text-lg font-semibold text-card-foreground">Included Timesheets</h2>
                    <p className="text-sm text-muted-foreground mt-1">Timesheets approved by the Team Lead and belonging to this batch.</p>
                </div>
                {timesheets.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">No timesheets found in this batch</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {timesheets.map((ts) => (
                            <div key={ts.ID} className="flex flex-col">
                                <div className="p-4 sm:p-6 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleTimesheet(ts.ID)}>
                                        <div className="p-1 text-muted-foreground">
                                            {expandedRows[ts.ID] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                                            {ts.user.firstName[0]}{ts.user.lastName[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-foreground hover:text-primary transition-colors">
                                                {ts.user.firstName} {ts.user.lastName}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {format(new Date(ts.year, ts.month - 1), 'MMM yyyy')}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    Timesheet ID: <span className="font-mono text-xs">{ts.ID.split('-')[0]}...</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-4 ml-14 sm:ml-0">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ts.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            ts.status === 'Finished' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                            }`}>
                                            {ts.status}
                                        </span>
                                        {status === 'Pending' && ts.status === 'Approved' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => setTsRejectId(ts.ID)}
                                            >
                                                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                                Reject
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Timesheet Inner View */}
                                {expandedRows[ts.ID] && (
                                    <div className="bg-muted/10 border-t border-border/50 px-4 py-6 sm:px-14">
                                        {loadingDetails[ts.ID] ? (
                                            <div className="text-sm text-muted-foreground animate-pulse py-4">Loading entries...</div>
                                        ) : timesheetDetails[ts.ID] ? (
                                            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Logged Entries</h4>

                                                {timesheetDetails[ts.ID].entries.length === 0 ? (
                                                    <p className="text-sm italic text-muted-foreground py-2">No entries found for this timesheet.</p>
                                                ) : (
                                                    <div className="rounded-md border border-border overflow-hidden bg-background">
                                                        <Table className="w-full text-sm text-left">
                                                            <TableHeader className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                                                                <TableRow>
                                                                    <TableHead className="px-4 py-3 font-medium">Date</TableHead>
                                                                    <TableHead className="px-4 py-3 font-medium">Project / Task</TableHead>
                                                                    <TableHead className="px-4 py-3 font-medium text-right">Logged</TableHead>
                                                                    <TableHead className="px-4 py-3 font-medium text-right">Approved</TableHead>
                                                                    <TableHead className="px-4 py-3 font-medium">Description</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody className="divide-y divide-border/50">
                                                                {timesheetDetails[ts.ID].entries.map((entry) => (
                                                                    <TableRow key={entry.id} className="hover:bg-muted/20">
                                                                        <TableCell className="px-4 py-3 whitespace-nowrap">{entry.date}</TableCell>
                                                                        <TableCell className="px-4 py-3">
                                                                            <div className="font-medium text-foreground">{entry.projectName}</div>
                                                                            {entry.taskName && <div className="text-xs text-muted-foreground mt-0.5">{entry.taskName}</div>}
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                                                                            {entry.hours}
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                                                                            {editingEntry?.entryId === entry.id ? (
                                                                                <div className="flex flex-col items-end gap-2 min-w-[140px]">
                                                                                    <Input
                                                                                        type="number"
                                                                                        step="0.5"
                                                                                        min="0"
                                                                                        max="24"
                                                                                        value={editingEntry.hours}
                                                                                        onChange={(e) => setEditingEntry({ ...editingEntry, hours: e.target.value })}
                                                                                        className="w-20 px-2 py-1 text-sm text-right h-8"
                                                                                        autoFocus
                                                                                        disabled={isSavingEntry}
                                                                                    />
                                                                                    <Input
                                                                                        type="text"
                                                                                        placeholder="Reason (optional)"
                                                                                        value={editingEntry.note}
                                                                                        onChange={(e) => setEditingEntry({ ...editingEntry, note: e.target.value })}
                                                                                        className="w-full min-w-[150px] px-2 py-1 text-xs h-8"
                                                                                        disabled={isSavingEntry}
                                                                                    />
                                                                                    <div className="flex gap-1 justify-end w-full">
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline"
                                                                                            className="h-6 text-[10px] px-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none"
                                                                                            onClick={() => handleSaveEntryHours(ts.ID, entry.id)}
                                                                                            disabled={isSavingEntry}
                                                                                        >
                                                                                            Save
                                                                                        </Button>
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline"
                                                                                            className="h-6 text-[10px] px-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border-none"
                                                                                            onClick={() => setEditingEntry(null)}
                                                                                            disabled={isSavingEntry}
                                                                                        >
                                                                                            Cancel
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div
                                                                                    className={`font-mono inline-flex items-center justify-end gap-2 cursor-pointer group hover:bg-muted/50 px-2 py-1 rounded transition-colors w-full ${status !== 'Pending' ? 'pointer-events-none' : ''}`}
                                                                                    title={status === 'Pending' ? "Click to modify registered hours" : ""}
                                                                                    onClick={() => {
                                                                                        if (status === 'Pending') {
                                                                                            setEditingEntry({
                                                                                                tsId: ts.ID,
                                                                                                entryId: entry.id,
                                                                                                hours: (entry.approvedHours !== undefined ? entry.approvedHours : entry.hours).toString(),
                                                                                                note: ''
                                                                                            })
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {entry.approvedHours !== undefined && entry.approvedHours !== entry.hours ? (
                                                                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-1 rounded" title="Modified by Admin">
                                                                                            {entry.approvedHours}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span>{entry.hours}</span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="px-4 py-3 text-muted-foreground truncate max-w-[200px]" title={entry.description || ''}>
                                                                            {entry.description || '-'}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                            <tfoot className="bg-muted/30 border-t border-border">
                                                                <TableRow>
                                                                    <TableCell colSpan={2} className="px-4 py-3 font-medium text-right">Total Logged:</TableCell>
                                                                    <TableCell className="px-4 py-3 font-bold font-mono text-right">{timesheetDetails[ts.ID].totalHours}</TableCell>
                                                                    <TableCell colSpan={2}></TableCell>
                                                                </TableRow>
                                                            </tfoot>
                                                        </Table>
                                                    </div>
                                                )}

                                                {timesheetDetails[ts.ID].comment && (
                                                    <div className="mt-4 p-3 bg-muted/40 rounded-md border border-border/50 text-sm">
                                                        <span className="font-medium text-foreground block mb-1">Employee Comment:</span>
                                                        <span className="text-muted-foreground italic">"{timesheetDetails[ts.ID].comment}"</span>
                                                    </div>
                                                )}

                                                {/* Timesheet Approval History */}
                                                {ts.approvalHistory && ts.approvalHistory.length > 0 && (
                                                    <div className="mt-6 pt-4 border-t border-border/50">
                                                        <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 text-muted-foreground">
                                                            <History className="h-4 w-4" /> Timesheet Edit & Approval History
                                                        </h4>
                                                        <div className="space-y-3">
                                                            {ts.approvalHistory.map((log) => (
                                                                <div key={log.ID} className="flex gap-3 text-sm border-l-2 border-muted pl-3 pb-1">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-medium text-foreground">{log.actor.firstName} {log.actor.lastName}</span>
                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${log.action === 'Modified' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                                log.action === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                                                    log.action === 'Rejected' ? 'bg-destructive/10 text-destructive' :
                                                                                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                                                                }`}>
                                                                                {log.action}
                                                                            </span>
                                                                            <span className="text-xs text-muted-foreground ml-auto">
                                                                                {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                                                                            </span>
                                                                        </div>
                                                                        {log.comment && (
                                                                            <p className="text-muted-foreground mt-1 text-xs">
                                                                                {log.comment}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-destructive py-4">Failed to load entries.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <StatusDialog
                open={statusDialog.open}
                onOpenChange={(open) => setStatusDialog(prev => ({ ...prev, open }))}
                variant={statusDialog.variant}
                title={statusDialog.title}
                description={statusDialog.description}
            />

            <ConfirmDialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
                title={confirmDialog.title}
                description={confirmDialog.description}
                onConfirm={confirmDialog.onConfirm}
                destructive={confirmDialog.destructive}
            />

            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <XCircle className="h-5 w-5" />
                            Reject Batch
                        </DialogTitle>
                        <DialogDescription>
                            Rejecting this batch will return all its timesheets to the "Submitted" state, sending them back to the Team Lead for review.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Rejection Reason</label>
                            <Textarea
                                className="min-h-[100px] resize-none"
                                placeholder="Please provide a reason why this batch is being rejected..."
                                value={rejectComment}
                                onChange={(e) => setRejectComment(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={executeReject} disabled={!rejectComment.trim()}>
                            Reject Batch
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!tsRejectId} onOpenChange={(open) => { if (!open) { setTsRejectId(null); setTsRejectComment(''); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <XCircle className="h-5 w-5" />
                            Reject Timesheet
                        </DialogTitle>
                        <DialogDescription>
                            You are about to reject this specific timesheet. It will be sent back to the employee, and removed from this batch's final approval.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Rejection Reason <span className="text-destructive">*</span></label>
                            <Textarea
                                className="min-h-[100px] resize-none"
                                placeholder="Please provide a mandatory reason explaining why this timesheet is being rejected..."
                                value={tsRejectComment}
                                onChange={(e) => setTsRejectComment(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => { setTsRejectId(null); setTsRejectComment(''); }}>Cancel</Button>
                        <Button variant="destructive" onClick={executeRejectTimesheet} disabled={!tsRejectComment.trim()}>
                            Reject Timesheet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}


