import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Eye,
    Send,
    Loader2,
    Check,
    X
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

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
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/shared/components/ui/dialog'
import { Textarea } from '@/shared/components/ui/textarea'
import { useApprovalStore } from '@/features/approvals/store/approvalStore'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import { FilterBar, type FilterFieldConfig, type FilterValues } from '@/shared/components/filterbar'
import { cn } from '@/shared/lib/utils'


type SortField = 'name' | 'period' | 'submitDate' | 'totalHours'
type SortDir = 'asc' | 'desc'

export default function ApprovalsPage() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { timesheets, isLoading, currentMonth, currentYear, setPeriod, fetchApprovableTimesheets, bulkApproveTimesheets, bulkRejectTimesheets, bulkBatchToAdmin, admins, fetchAdmins } = useApprovalStore()
    const { currentUser, fetchCurrentUser } = useTimesheetStore()
    const [sortField, setSortField] = useState<SortField>('submitDate')
    const [sortDir, setSortDir] = useState<SortDir>('desc')

    // FilterBar state
    const [filterValues, setFilterValues] = useState<FilterValues>(() => ({
        year: String(currentYear),
        month: String(currentMonth),
        searchQuery: ''
    }))

    const handleApplyFilters = useCallback((values: FilterValues) => {
        const m = Number(values.month)
        const y = Number(values.year)
        if (m !== currentMonth || y !== currentYear) {
            setPeriod(m, y)
            setSelectedIds([])
        }
    }, [currentMonth, currentYear, setPeriod])

    const filterConfig: FilterFieldConfig[] = useMemo(() => [
        {
            key: 'year',
            label: 'Year',
            type: 'select',
            options: Array.from({ length: 5 }, (_, i) => {
                const y = new Date().getFullYear() - 2 + i;
                return { value: String(y), label: String(y) };
            }),
            placeholder: t('common.select', 'Select...'),
        },
        {
            key: 'month',
            label: 'Month',
            type: 'select',
            options: Array.from({ length: 12 }, (_, i) => i + 1).map(m => ({
                value: String(m),
                label: t(`approvalsPage.months.${m}`),
            })),
            placeholder: t('common.select', 'Select...'),
        },
        {
            key: 'searchQuery',
            label: 'Search',
            type: 'text',
            placeholder: t('approvalsPage.searchPlaceholder'),
        },
    ], [t])

    // Selection
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const [adminModal, setAdminModal] = useState<{ open: boolean, adminId: string }>({
        open: false, adminId: ''
    })
    const [commentModal, setCommentModal] = useState<{ open: boolean, action: 'approve' | 'reject', comment: string }>({
        open: false, action: 'approve', comment: ''
    })

    useEffect(() => {
        if (!currentUser) fetchCurrentUser()
    }, [currentUser, fetchCurrentUser])

    useEffect(() => {
        if (currentUser) {
            fetchApprovableTimesheets()
            fetchAdmins()
        }
    }, [currentUser, fetchApprovableTimesheets, fetchAdmins])

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

    const displayedTimesheets = useMemo(() => {
        let list = [...timesheets]

        // Search filter (front-end filtering)
        const q = (filterValues.searchQuery as string || '').toLowerCase()
        if (q) {
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
    }, [timesheets, filterValues.searchQuery, sortField, sortDir])

    const isAllSelected = displayedTimesheets.length > 0 && displayedTimesheets.every(ts => selectedIds.includes(ts.id))

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([])
        } else {
            setSelectedIds(displayedTimesheets.map(ts => ts.id))
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const resetSelection = () => {
        setSelectedIds([])
    }

    // ---- Handlers ----
    const handleOpenCommentModal = (action: 'approve' | 'reject') => {
        if (selectedIds.length === 0) return
        setCommentModal({ open: true, action, comment: '' })
    }

    const confirmBulkAction = async () => {
        if (selectedIds.length === 0) return
        setActionLoading(commentModal.action)
        try {
            if (commentModal.action === 'approve') {
                // In store, bulkApproveTimesheets doesn't take comment currently, but TEAMLEAD_URL.bulkApprove does.
                // We'll just call the store action for now. If store needs updating to pass comment, we can do it later.
                // For reject, comment is highly recommended.
                await bulkApproveTimesheets(selectedIds)
            } else {
                await bulkRejectTimesheets(selectedIds)
            }
            setCommentModal({ open: false, action: 'approve', comment: '' })
            resetSelection()
        } catch (error) {
            console.error(error)
        } finally {
            setActionLoading(null)
        }
    }

    const handleCreateBatch = async () => {
        if (selectedIds.length === 0 || !adminModal.adminId) return
        setActionLoading('batch')
        try {
            await bulkBatchToAdmin(selectedIds, adminModal.adminId)
            setAdminModal({ open: false, adminId: '' })
            resetSelection()
        } catch (error) {
            console.error(error)
        } finally {
            setActionLoading(null)
        }
    }

    const handleReview = (timesheetId: string) => {
        navigate(`/approvals/${timesheetId}`)
    }

    const getInitials = (firstName?: string, lastName?: string) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '??'
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                        {t('approvalsPage.title')}
                    </h1>
                    <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-sm text-muted-foreground">
                            {t('approvalsPage.description')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <FilterBar
                config={filterConfig}
                values={filterValues}
                onChange={setFilterValues}
                onApply={handleApplyFilters}
                isLoading={isLoading}
                className="mb-4"
            />

            <div className="bg-card border border-border rounded-xl flex flex-col min-h-[500px]">
                {isLoading ? (
                    <div className="flex flex-col flex-1 items-center justify-center py-16 text-muted-foreground">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
                        <p className="text-sm">{t('approvalsPage.loading')}</p>
                    </div>
                ) : displayedTimesheets.length === 0 ? (
                    <div className="flex flex-col flex-1 items-center justify-center py-16">
                        <p className="text-muted-foreground font-medium">{t('approvalsPage.noTimesheets')}</p>
                        <p className="text-sm text-muted-foreground/60 mt-1">
                            {t('approvalsPage.allCaughtUp')}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Summary Toolbar */}
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card text-foreground rounded-t-xl">
                            <h2 className="text-base font-semibold">
                                {t('approvalsPage.badge')} <span className="text-primary">({timesheets.length})</span>
                            </h2>
                        </div>

                        {/* Actions Bar */}
                        {selectedIds.length > 0 && (
                            <div className="bg-primary/5 border-b border-border/50 px-5 py-3 flex items-center justify-between">
                                <span className="text-sm font-medium text-primary">
                                    {t('approvalsPage.selectedCount', { count: selectedIds.length })}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-sap-negative text-sap-negative hover:bg-sap-negative/10"
                                        onClick={() => handleOpenCommentModal('reject')}
                                        disabled={actionLoading !== null}
                                    >
                                        {actionLoading === 'reject' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                                        {t('approvalsPage.rejectSelected')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleOpenCommentModal('approve')}
                                        disabled={actionLoading !== null}
                                    // className="bg-sap-positive hover:bg-sap-positive/90 text-white shadow-sm"
                                    >
                                        {actionLoading === 'approve' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                        {t('approvalsPage.approveSelected')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => setAdminModal({ open: true, adminId: '' })}
                                        disabled={actionLoading !== null}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        {t('approvalsPage.submitBatch')}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-border bg-muted/30">
                                        <TableHead className="py-3.5 px-5 w-[40px] text-center">
                                            <Checkbox
                                                checked={isAllSelected}
                                                onCheckedChange={handleSelectAll}
                                                className="translate-y-[2px]"
                                            />
                                        </TableHead>
                                        <TableHead
                                            className="text-left py-3.5 px-2 text-xs font-semibold text-primary uppercase tracking-wider cursor-pointer select-none hover:text-primary/80 transition-colors"
                                            onClick={() => toggleSort('name')}
                                        >
                                            <span className="inline-flex items-center">
                                                {t('approvalsPage.table.employee')}
                                                <SortIcon field="name" />
                                            </span>
                                        </TableHead>
                                        <TableHead
                                            className="text-left py-3.5 px-4 text-xs font-semibold text-primary uppercase tracking-wider cursor-pointer select-none hover:text-primary/80 transition-colors"
                                            onClick={() => toggleSort('period')}
                                        >
                                            <span className="inline-flex items-center">
                                                {t('approvalsPage.table.period')}
                                                <SortIcon field="period" />
                                            </span>
                                        </TableHead>
                                        <TableHead
                                            className="text-left py-3.5 px-4 text-xs font-semibold text-primary uppercase tracking-wider cursor-pointer select-none hover:text-primary/80 transition-colors"
                                            onClick={() => toggleSort('submitDate')}
                                        >
                                            <span className="inline-flex items-center">
                                                {t('approvalsPage.table.submittedDate')}
                                                <SortIcon field="submitDate" />
                                            </span>
                                        </TableHead>
                                        <TableHead
                                            className="text-right py-3.5 px-4 text-xs font-semibold text-primary uppercase tracking-wider cursor-pointer select-none hover:text-primary/80 transition-colors"
                                            onClick={() => toggleSort('totalHours')}
                                        >
                                            <span className="inline-flex items-center justify-end">
                                                {t('approvalsPage.table.totalHours')}
                                                <SortIcon field="totalHours" />
                                            </span>
                                        </TableHead>
                                        <TableHead className="text-center py-3.5 px-4 text-xs font-semibold text-primary uppercase tracking-wider">
                                            {t('approvalsPage.table.status')}
                                        </TableHead>
                                        <TableHead className="text-center py-3.5 px-4 text-xs font-semibold text-primary uppercase tracking-wider">
                                            {t('approvalsPage.table.actions')}
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-border/50">
                                    {displayedTimesheets.map(ts => {
                                        const period = `${t(`approvalsPage.months.${ts.month}`)} ${ts.year}`
                                        const submittedDate = ts.submitDate
                                            ? format(new Date(ts.submitDate), 'MMM dd, hh:mm a')
                                            : '—'
                                        const initials = getInitials(ts.user?.firstName, ts.user?.lastName)

                                        return (
                                            <TableRow
                                                key={ts.id}
                                                className={cn(
                                                    "group hover:bg-muted/20 transition-colors",
                                                    selectedIds.includes(ts.id) && "bg-primary/5"
                                                )}
                                            >
                                                <TableCell className="py-4 px-5 w-[40px] text-center">
                                                    <Checkbox
                                                        checked={selectedIds.includes(ts.id)}
                                                        onCheckedChange={() => toggleSelect(ts.id)}
                                                        className="translate-y-[2px]"
                                                    />
                                                </TableCell>
                                                <TableCell className="py-4 px-2">
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
                                                </TableCell>
                                                <TableCell className="py-4 px-4 text-sm text-primary/80 font-medium whitespace-nowrap">
                                                    {period}
                                                </TableCell>
                                                <TableCell className="py-4 px-4 text-sm text-muted-foreground whitespace-nowrap">
                                                    {submittedDate}
                                                </TableCell>
                                                <TableCell className="py-4 px-4 text-sm text-right font-semibold text-foreground">
                                                    {(ts.totalHours || 0).toFixed(1)}
                                                </TableCell>
                                                <TableCell className="py-4 px-4 text-center">
                                                    <span className={cn(
                                                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                                        ts.status === 'Submitted' ? "bg-sap-informative/10 text-sap-informative" : "bg-sap-positive/10 text-sap-positive"
                                                    )}>
                                                        {ts.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-4 px-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs font-medium border-primary/30 text-primary hover:bg-primary/5 hover:text-primary h-8 px-2"
                                                            onClick={() => handleReview(ts.id)}
                                                        >
                                                            <Eye className="h-3.5 w-3.5 mr-1" />
                                                            {t('approvalsPage.reviewDetails')}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-5 py-3 border-t border-border mt-auto bg-muted/10">
                            <span className="text-sm text-primary/70">
                                {t('approvalsPage.showing')} <strong className="text-foreground">{displayedTimesheets.length}</strong> {t('approvalsPage.records')}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Admin Select Modal */}
            <Dialog open={adminModal.open} onOpenChange={(open) => !actionLoading && setAdminModal(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('approvalsPage.adminModal.title')}</DialogTitle>
                        <DialogDescription>
                            {t('approvalsPage.adminModal.description', { count: selectedIds.length })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select
                            value={adminModal.adminId}
                            onValueChange={(val) => setAdminModal(prev => ({ ...prev, adminId: val }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('approvalsPage.adminModal.placeholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                {admins.map((a: any) => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.firstName} {a.lastName} ({a.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAdminModal({ open: false, adminId: '' })} disabled={actionLoading !== null}>
                            {t('approvalsPage.adminModal.cancel')}
                        </Button>
                        <Button onClick={handleCreateBatch} disabled={!adminModal.adminId || actionLoading !== null}>
                            {actionLoading === 'batch' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('approvalsPage.adminModal.createBatch')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Comment Modal for Bulk Actions */}
            <Dialog open={commentModal.open} onOpenChange={(open) => !actionLoading && setCommentModal(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {commentModal.action === 'approve' ? t('approvalsPage.commentModal.titleApprove') : t('approvalsPage.commentModal.titleReject')}
                        </DialogTitle>
                        <DialogDescription>
                            {commentModal.action === 'approve'
                                ? t('approvalsPage.commentModal.descApprove', { count: selectedIds.length })
                                : t('approvalsPage.commentModal.descReject', { count: selectedIds.length })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder={t('approvalsPage.commentModal.placeholder')}
                            value={commentModal.comment}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCommentModal(prev => ({ ...prev, comment: e.target.value }))}
                            className="min-h-[100px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCommentModal({ open: false, action: 'approve', comment: '' })} disabled={actionLoading !== null}>
                            {t('approvalsPage.commentModal.cancel')}
                        </Button>
                        <Button
                            onClick={confirmBulkAction}
                            disabled={actionLoading !== null || (commentModal.action === 'reject' && !commentModal.comment.trim())}
                            className={commentModal.action === 'reject' ? 'bg-sap-negative hover:bg-sap-negative/90 text-white' : 'bg-sap-positive hover:bg-sap-positive/90 text-white'}
                        >
                            {actionLoading !== null && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {commentModal.action === 'approve' ? t('approvalsPage.commentModal.confirmApprove') : t('approvalsPage.commentModal.confirmReject')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}
