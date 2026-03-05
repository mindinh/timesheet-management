import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/shared/components/ui/dialog'
import { Textarea } from '@/shared/components/ui/textarea'
import { Badge } from '@/shared/components/ui/badge'
import DataTable, { type DataTableColumn } from '@/shared/components/common/DataTable'
import { TableActionBar } from '@/shared/components/common/TableActionBar'
import { useApprovalStore } from '@/features/approvals/store/approvalStore'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import { FilterBar, type FilterFieldConfig, type FilterValues } from '@/shared/components/filterbar'
import { cn } from '@/shared/lib/utils'



export default function ApprovalsPage() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { timesheets, isLoading, currentMonth, currentYear, setPeriod, fetchApprovableTimesheets, bulkApproveTimesheets, bulkReopenTimesheetsForEdit, bulkBatchToAdmin, admins, fetchAdmins } = useApprovalStore()
    const { currentUser, fetchCurrentUser } = useTimesheetStore()

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
    const [commentModal, setCommentModal] = useState<{ open: boolean, action: 'approve' | 'reopen', comment: string }>({
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

    const getInitials = (firstName?: string, lastName?: string) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '??'
    }

    const columns: DataTableColumn<any>[] = useMemo(() => [
        {
            key: 'employee',
            labelKey: 'approvalsPage.table.employee',
            width: 250,
            renderType: 'custom',
            render: (_val, row) => {
                const initials = getInitials(row.user?.firstName, row.user?.lastName)
                return (
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-sm font-semibold ring-1 ring-primary/10">
                            {initials}
                        </div>
                        <div>
                            <div className="font-medium text-sm text-foreground">
                                {row.user?.firstName} {row.user?.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {row.user?.role || 'Employee'}
                            </div>
                        </div>
                    </div>
                )
            }
        },
        {
            key: 'period',
            labelKey: 'approvalsPage.table.period',
            width: 150,
            renderType: 'custom',
            render: (_val, row) => (
                <span className="text-sm text-primary/80 font-medium whitespace-nowrap">
                    {t(`approvalsPage.months.${row.month}`)} {row.year}
                </span>
            )
        },
        {
            key: 'submitDate',
            labelKey: 'approvalsPage.table.submittedDate',
            width: 180,
            renderType: 'custom',
            render: (_val, row) => (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {row.submitDate ? format(new Date(row.submitDate), 'MMM dd, hh:mm a') : '—'}
                </span>
            )
        },
        {
            key: 'totalHours',
            labelKey: 'approvalsPage.table.totalHours',
            width: 120,
            renderType: 'custom',
            className: 'text-right',
            render: (_val, row) => (
                <span className="text-sm font-semibold text-foreground text-right block w-full">
                    {(row.totalHours || 0).toFixed(1)}
                </span>
            )
        },
        {
            key: 'status',
            labelKey: 'approvalsPage.table.status',
            width: 150,
            renderType: 'custom',
            className: 'text-center',
            render: (_val, row) => (
                <div className="text-center w-full block">
                    <Badge
                        variant={row.status === 'Submitted' ? 'secondary' : 'default'}
                        className={cn(
                            row.status === 'Submitted' ? "bg-sap-informative/10 text-sap-informative hover:bg-sap-informative/10" : "bg-sap-positive/10 text-sap-positive hover:bg-sap-positive/10"
                        )}
                    >
                        {row.status}
                    </Badge>
                </div>
            )
        },
        {
            key: 'actions',
            labelKey: 'approvalsPage.table.actions',
            width: 150,
            renderType: 'custom',
            className: 'text-center',
            render: (_val, row) => (
                <div className="text-center w-full block bg-transparent">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs font-medium text-primary hover:text-primary h-8 px-2"
                        onClick={(e) => { e.stopPropagation(); handleReview(row.id); }}
                    >
                        <Eye className="h-4 w-4 mr-1" />
                        {t('approvalsPage.reviewDetails')}
                    </Button>
                </div>
            )
        }
    ], [t])

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

        // Sort by submitDate desc by default since custom sorting is removed
        list = [...list].sort((a, b) => {
            return new Date(b.submitDate || 0).getTime() - new Date(a.submitDate || 0).getTime()
        })

        return list
    }, [timesheets, filterValues.searchQuery])
    const resetSelection = () => {
        setSelectedIds([])
    }

    // ---- Handlers ----
    const handleOpenCommentModal = (action: 'approve' | 'reopen') => {
        if (selectedIds.length === 0) return
        setCommentModal({ open: true, action, comment: '' })
    }

    const confirmBulkAction = async () => {
        if (selectedIds.length === 0) return
        setActionLoading(commentModal.action)
        try {
            if (commentModal.action === 'approve') {
                await bulkApproveTimesheets(selectedIds)
            } else {
                await bulkReopenTimesheetsForEdit(selectedIds, commentModal.comment)
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

            <div className="flex flex-col space-y-4">
                {selectedIds.length > 0 && (
                    <div className="bg-primary/5 border border-border/50 rounded-lg px-5 py-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                            {t('approvalsPage.selectedCount', { count: selectedIds.length })}
                        </span>
                        <TableActionBar
                            align="right"
                            actions={[
                                {
                                    id: 'reopen',
                                    labelKey: 'approvalsPage.rejectSelected',
                                    icon: X,
                                    size: 'sm',
                                    variant: 'outline',
                                    className: 'border-sap-negative text-sap-negative hover:bg-sap-negative/10 px-4',
                                    onClick: () => handleOpenCommentModal('reopen'),
                                    disabled: actionLoading !== null,
                                },
                                {
                                    id: 'approve',
                                    labelKey: 'approvalsPage.approveSelected',
                                    icon: Check,
                                    size: 'sm',
                                    variant: 'default',
                                    className: 'px-4',
                                    onClick: () => handleOpenCommentModal('approve'),
                                    disabled: actionLoading !== null,
                                },
                                {
                                    id: 'submitBatch',
                                    labelKey: 'approvalsPage.submitBatch',
                                    icon: Send,
                                    size: 'sm',
                                    variant: 'default',
                                    className: 'bg-primary hover:bg-primary/90 text-primary-foreground px-4',
                                    onClick: () => setAdminModal({ open: true, adminId: '' }),
                                    disabled: actionLoading !== null,
                                }
                            ]}
                        />
                    </div>
                )}
                <DataTable
                    data={displayedTimesheets}
                    columns={columns}
                    isLoading={isLoading}
                    title={`${t('approvalsPage.badge')} (${timesheets.length})`}
                    selection={{
                        enabled: true,
                        mode: 'multiple',
                        selectedIds: new Set(selectedIds),
                        onSelectionChange: (ids) => setSelectedIds(Array.from(ids)),
                        getRowId: (row) => row.id
                    }}
                    onRowClick={(row) => handleReview(row.id)}
                    showFooter={false}
                    emptyMessageKey="approvalsPage.noTimesheets"
                />
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
                            disabled={actionLoading !== null || (commentModal.action === 'reopen' && !commentModal.comment.trim())}
                            className={commentModal.action === 'reopen' ? 'bg-sap-negative hover:bg-sap-negative/90 text-white' : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'}
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
