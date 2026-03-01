import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
    Search,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ClipboardList,
    Eye,
    CheckCircle2,
    Download,
    Send,
    Loader2
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useApprovalStore } from '@/features/approvals/store/approvalStore'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import { cn } from '@/shared/lib/utils'

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

const STATUS_OPTIONS = ['All', 'Submitted', 'Approved', 'Rejected', 'Finished'] as const

const statusBadgeStyles: Record<string, string> = {
    Submitted: 'bg-sap-critical/10 text-sap-critical border-sap-critical/20',
    Approved: 'bg-sap-positive/10 text-sap-positive border-sap-positive/20',
    Rejected: 'bg-sap-negative/10 text-sap-negative border-sap-negative/20',
    Finished: 'bg-sap-positive/10 text-sap-positive border-sap-positive/20',
}

type SortField = 'name' | 'period' | 'submitDate' | 'totalHours'
type SortDir = 'asc' | 'desc'

export default function ApprovalsPage() {
    const navigate = useNavigate()
    const { timesheets, isLoading, filter, setFilter, fetchApprovableTimesheets } = useApprovalStore()
    const { currentUser, fetchCurrentUser } = useTimesheetStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [sortField, setSortField] = useState<SortField>('submitDate')
    const [sortDir, setSortDir] = useState<SortDir>('desc')

    // Batch submit state
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [actionLoading, setActionLoading] = useState(false)

    useEffect(() => {
        if (!currentUser) fetchCurrentUser()
    }, [currentUser, fetchCurrentUser])

    useEffect(() => {
        if (currentUser) fetchApprovableTimesheets()
    }, [currentUser, fetchApprovableTimesheets])

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDir('asc')
        }
    }

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
        return sortDir === 'asc'
            ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
            : <ArrowDown className="h-3 w-3 ml-1 text-primary" />
    }

    const filteredTimesheets = useMemo(() => {
        let list = timesheets

        // Status filter
        if (filter !== 'All') {
            list = list.filter(ts => ts.status === filter)
        }

        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            list = list.filter(ts =>
                ts.user?.firstName?.toLowerCase().includes(q) ||
                ts.user?.lastName?.toLowerCase().includes(q) ||
                ts.user?.email?.toLowerCase().includes(q)
            )
        }

        // Sort
        list = [...list].sort((a, b) => {
            const dir = sortDir === 'asc' ? 1 : -1
            switch (sortField) {
                case 'name': {
                    const nameA = `${a.user?.firstName || ''} ${a.user?.lastName || ''}`.toLowerCase()
                    const nameB = `${b.user?.firstName || ''} ${b.user?.lastName || ''}`.toLowerCase()
                    return nameA.localeCompare(nameB) * dir
                }
                case 'period': {
                    const pA = (a.year * 100) + a.month
                    const pB = (b.year * 100) + b.month
                    return (pA - pB) * dir
                }
                case 'submitDate':
                    return (new Date(a.submitDate || 0).getTime() - new Date(b.submitDate || 0).getTime()) * dir
                case 'totalHours':
                    return ((a.totalHours || 0) - (b.totalHours || 0)) * dir
                default:
                    return 0
            }
        })

        return list
    }, [timesheets, filter, searchQuery, sortField, sortDir])

    const pendingCount = timesheets.filter(ts => ts.status === 'Submitted').length

    const submittableIds = useMemo(() => {
        return filteredTimesheets
            .filter(ts => ts.status === 'Approved')
            .map(ts => ts.id)
    }, [filteredTimesheets])

    const isAllSelected = submittableIds.length > 0 && submittableIds.every(id => selectedIds.includes(id))

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([])
        } else {
            setSelectedIds(submittableIds)
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const handleBatchSubmit = async () => {
        if (selectedIds.length === 0) return
        setActionLoading(true)
        try {
            // Note: Temporarily leaving this block for eventual bulk submit to backend.
            // Currently bulk submission is not defined directly via UI in the new plan
            // without a target "adminId", but this handles UI state clearing.
            console.log('Batch Submit IDs:', selectedIds)
            // TODO: Call bulk batch submit API here if needed by new flow
            setSelectedIds([])
        } catch (error) {
            console.error(error)
        } finally {
            setActionLoading(false)
        }
    }

    const handleReview = (timesheetId: string) => {
        navigate(`/approvals/${timesheetId}`)
    }

    const getInitials = (firstName?: string, lastName?: string) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '??'
    }

    const getStatusLabel = (status: string) => {
        if (status === 'Submitted') return 'Pending'
        return status
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* ── Header ── */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                        Approvals Worklist
                    </h1>
                    <div className="flex items-center gap-3 mt-1.5">
                        {pendingCount > 0 && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
                                {pendingCount} Pending
                            </span>
                        )}
                        <span className="text-sm text-muted-foreground">
                            Review and manage employee timesheet submissions.
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-5 py-3.5">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search employee or project..."
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Status Filter */}
                <div className="relative">
                    <select
                        className="pl-4 pr-8 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer min-w-[140px]"
                        value={filter}
                        onChange={e => setFilter(e.target.value as typeof filter)}
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>
                                Status: {opt}
                            </option>
                        ))}
                    </select>
                    <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
                        <p className="text-sm">Loading timesheets...</p>
                    </div>
                ) : filteredTimesheets.length === 0 ? (
                    <div className="text-center py-16">
                        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground font-medium">No timesheets to review</p>
                        <p className="text-sm text-muted-foreground/60 mt-1">
                            {filter !== 'All'
                                ? `No ${filter.toLowerCase()} timesheets found.`
                                : 'All caught up! Check back later.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Action Bar for Batch Submit */}
                        {selectedIds.length > 0 && (
                            <div className="bg-primary/5 border-b border-border/50 px-5 py-3 flex items-center justify-between">
                                <span className="text-sm font-medium text-primary">
                                    {selectedIds.length} timesheet(s) selected
                                </span>
                                <Button
                                    size="sm"
                                    onClick={handleBatchSubmit}
                                    disabled={actionLoading}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs shadow-sm"
                                >
                                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-2" />}
                                    Create Batch
                                </Button>
                            </div>
                        )}

                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="py-3.5 px-5 w-[40px] text-center">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={handleSelectAll}
                                            disabled={submittableIds.length === 0}
                                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                                            title="Select all Approved"
                                        />
                                    </th>
                                    <th
                                        className="text-left py-3.5 px-2 text-xs font-semibold text-primary uppercase tracking-wider cursor-pointer select-none hover:text-primary/80 transition-colors"
                                        onClick={() => toggleSort('name')}
                                    >
                                        <span className="inline-flex items-center">
                                            Submitted By
                                            <SortIcon field="name" />
                                        </span>
                                    </th>
                                    <th
                                        className="text-left py-3.5 px-4 text-xs font-semibold text-primary uppercase tracking-wider cursor-pointer select-none hover:text-primary/80 transition-colors"
                                        onClick={() => toggleSort('period')}
                                    >
                                        <span className="inline-flex items-center">
                                            Period
                                            <SortIcon field="period" />
                                        </span>
                                    </th>
                                    <th
                                        className="text-left py-3.5 px-4 text-xs font-semibold text-primary uppercase tracking-wider cursor-pointer select-none hover:text-primary/80 transition-colors"
                                        onClick={() => toggleSort('submitDate')}
                                    >
                                        <span className="inline-flex items-center">
                                            Submission Date
                                            <SortIcon field="submitDate" />
                                        </span>
                                    </th>
                                    <th
                                        className="text-right py-3.5 px-4 text-xs font-semibold text-primary uppercase tracking-wider cursor-pointer select-none hover:text-primary/80 transition-colors"
                                        onClick={() => toggleSort('totalHours')}
                                    >
                                        <span className="inline-flex items-center justify-end">
                                            Total Hours
                                            <SortIcon field="totalHours" />
                                        </span>
                                    </th>
                                    <th className="text-center py-3.5 px-4 text-xs font-semibold text-primary uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="text-center py-3.5 px-4 text-xs font-semibold text-primary uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredTimesheets.map(ts => {
                                    const period = `${MONTH_NAMES[ts.month]} ${ts.year}`
                                    const submittedDate = ts.submitDate
                                        ? format(new Date(ts.submitDate), 'MMM dd, hh:mm a')
                                        : '—'
                                    const initials = getInitials(ts.user?.firstName, ts.user?.lastName)
                                    const statusLabel = getStatusLabel(ts.status)

                                    return (
                                        <tr
                                            key={ts.id}
                                            className={cn(
                                                "group hover:bg-muted/20 transition-colors",
                                                selectedIds.includes(ts.id) && "bg-primary/5"
                                            )}
                                        >
                                            {/* Checkbox */}
                                            <td className="py-4 px-5 w-[40px] text-center">
                                                {ts.status === 'Approved' && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(ts.id)}
                                                        onChange={() => toggleSelect(ts.id)}
                                                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                                                    />
                                                )}
                                            </td>

                                            {/* Employee info */}
                                            <td className="py-4 px-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-sm font-semibold ring-1 ring-primary/10">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm text-foreground">
                                                            {ts.user?.firstName} {ts.user?.lastName}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {ts.user?.role || 'Employee'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Period */}
                                            <td className="py-4 px-4 text-sm text-primary/80 font-medium">
                                                {period}
                                            </td>

                                            {/* Submission Date */}
                                            <td className="py-4 px-4 text-sm text-muted-foreground">
                                                {submittedDate}
                                            </td>

                                            {/* Total Hours */}
                                            <td className="py-4 px-4 text-sm text-right font-semibold text-foreground">
                                                {(ts.totalHours || 0).toFixed(1)}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-4 px-4 text-center">
                                                <span className={cn(
                                                    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border',
                                                    statusBadgeStyles[ts.status] || 'bg-muted text-muted-foreground border-border'
                                                )}>
                                                    {statusLabel}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs font-medium border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
                                                        onClick={() => handleReview(ts.id)}
                                                    >
                                                        <Eye className="h-3.5 w-3.5 mr-1" />
                                                        Review
                                                    </Button>
                                                    <button
                                                        className="p-1.5 rounded-md text-sap-positive hover:bg-sap-positive/10 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Quick Approve"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        className="p-1.5 rounded-md text-muted-foreground hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Download"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/10">
                            <span className="text-sm text-primary/70">
                                Showing <strong className="text-foreground">{filteredTimesheets.length}</strong> of{' '}
                                <strong className="text-foreground">{timesheets.length}</strong>{' '}
                                pending approvals
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div >
    )
}
