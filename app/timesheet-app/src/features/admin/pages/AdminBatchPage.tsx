import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Layers, CheckCircle2, XCircle, Eye, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/shared/components/ui/button'
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
import { fetchTimesheetBatches, markBatchDoneApi, rejectBatchApi } from '@/features/admin/api/admin-api'
import type { TimesheetBatch } from '@/features/admin/api/admin-api'
import { cn } from '@/shared/lib/utils'

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

export default function AdminBatchPage() {
    const navigate = useNavigate()
    const [batches, setBatches] = useState<TimesheetBatch[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Action states
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
    const [batchToReject, setBatchToReject] = useState<string | null>(null)
    const [rejectComment, setRejectComment] = useState('')

    useEffect(() => {
        loadBatches()
    }, [])

    const loadBatches = async () => {
        try {
            setIsLoading(true)
            const data = await fetchTimesheetBatches()
            setBatches(data)
        } catch (error) {
            console.error('Failed to load batches:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleMarkDone = async (batchId: string) => {
        try {
            setActionLoadingId(batchId)
            await markBatchDoneApi(batchId)
            await loadBatches()
        } catch (error) {
            console.error('Failed to mark batch done:', error)
        } finally {
            setActionLoadingId(null)
        }
    }

    const handleRejectBatch = async () => {
        if (!batchToReject || !rejectComment.trim()) return

        try {
            setActionLoadingId(batchToReject)
            setRejectDialogOpen(false)
            await rejectBatchApi(batchToReject, rejectComment)
            await loadBatches()
        } catch (error) {
            console.error('Failed to reject batch:', error)
        } finally {
            setActionLoadingId(null)
            setBatchToReject(null)
            setRejectComment('')
        }
    }

    const openRejectDialog = (batchId: string) => {
        setBatchToReject(batchId)
        setRejectComment('')
        setRejectDialogOpen(true)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    const filteredBatches = batches;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Breadcrumb & Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/admin')}
                    className="rounded-full rounded-full"
                >
                    <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Layers className="h-6 w-6 text-primary" />
                        Timesheet Batches
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Review and manage monthly timesheet batches submitted by Team Leads.
                    </p>
                </div>
            </div>

            {/* List */}
            {batches.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center justify-center text-center">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <h3 className="text-lg font-medium">No pending batches</h3>
                    <p className="text-sm text-muted-foreground mt-1">All team lead submissions have been processed.</p>
                </div>
            ) : (
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead className="uppercase tracking-wider">
                                    Period (Created At)
                                </TableHead>
                                <TableHead className="uppercase tracking-wider">
                                    ID
                                </TableHead>
                                <TableHead className="uppercase tracking-wider">Submitted By (Team Lead)</TableHead>
                                <TableHead className="uppercase tracking-wider text-center">Contains</TableHead>
                                <TableHead className="uppercase tracking-wider text-center">Status</TableHead>
                                <TableHead className="text-center uppercase tracking-wider">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-card">
                            {filteredBatches.map(batch => {
                                const createdDate = batch.createdAt ? new Date(batch.createdAt) : null
                                const monthName = createdDate ? MONTH_NAMES[createdDate.getMonth() + 1] : 'Unknown Month'
                                const year = createdDate ? createdDate.getFullYear() : 'Unknown Year'
                                const isActionLoading = actionLoadingId === batch.ID

                                return (
                                    <TableRow key={batch.ID} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm border border-primary/20">
                                                    {monthName.substring(0, 3)}
                                                </div>
                                                <div>
                                                    <span className="text-foreground font-semibold">{monthName} {year}</span>
                                                    <div className="text-xs text-muted-foreground">
                                                        Created: {createdDate ? format(createdDate, 'MMM dd, yyyy') : 'No Date'}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border">
                                                    {batch.ID.split('-')[0]}...
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex justify-center items-center text-xs font-semibold">
                                                    {batch.teamLead?.firstName?.[0]}{batch.teamLead?.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium">
                                                        {batch.teamLead?.firstName} {batch.teamLead?.lastName}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{batch.teamLead?.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center justify-center bg-muted px-2.5 py-1 rounded-md text-xs font-medium border">
                                                {batch.timesheets?.length || 0} timesheets
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={cn(
                                                "inline-block px-2 py-1 rounded-full text-xs font-medium",
                                                batch.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'
                                            )}>
                                                {batch.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center gap-2">
                                                {batch.status === 'Pending' && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs border-sap-positive/30 text-sap-positive hover:bg-sap-positive/10"
                                                            onClick={() => handleMarkDone(batch.ID)}
                                                            disabled={isActionLoading}
                                                        >
                                                            {isActionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                                                            Mark Done
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs border-sap-negative/30 text-sap-negative hover:bg-sap-negative/10"
                                                            onClick={() => openRejectDialog(batch.ID)}
                                                            disabled={isActionLoading}
                                                        >
                                                            {isActionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground"
                                                    onClick={() => navigate(`/admin/batches/${batch.ID}`)}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" /> View
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-sap-negative" />
                            Reject Batch
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to reject this batch? Provide a reason for this rejection. All timesheets in this batch will be marked as Rejected.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Rejection Reason</label>
                            <Textarea
                                className="min-h-[100px] resize-none"
                                placeholder="Enter rejection reason here..."
                                value={rejectComment}
                                onChange={(e) => setRejectComment(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setRejectDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-sap-negative hover:bg-sap-negative/90 text-white"
                            onClick={handleRejectBatch}
                            disabled={!rejectComment.trim()}
                        >
                            Reject Batch
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
