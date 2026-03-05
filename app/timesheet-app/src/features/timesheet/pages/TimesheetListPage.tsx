import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
<<<<<<< HEAD
import { Calendar, Eye, History, FileText, Download, ArrowUp, Settings } from 'lucide-react'
=======
import { Calendar, Eye, History } from 'lucide-react'
>>>>>>> 0e4ef9951f992fee4c069ac76453c4e15e9c6b45
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn, SelectionConfig } from '@/shared/components/common/DataTable'
import { FilterBar, type FilterFieldConfig, type FilterValues, initializeFilterValues } from '@/shared/components/filterbar'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import { getAllTimesheets } from '@/features/timesheet/api/timesheet-api'
import type { Timesheet } from '@/shared/types'
import { useTranslation } from 'react-i18next'

// ─── Constants ──────────────────────────────────────────────

const statusColors: Record<string, string> = {
    Draft: 'bg-status-obsoleted text-status-obsoleted-text border-status-obsoleted-border',
    Submitted: 'bg-status-sent text-status-sent-text border-status-sent-border',
    Approved_By_TeamLead: 'bg-status-completed text-status-completed-text border-status-completed-border',
    Approved: 'bg-status-completed text-status-completed-text border-status-completed-border',
    Rejected: 'bg-status-new text-status-new-text border-status-new-border',
    Finished: 'bg-status-completed text-status-completed-text border-status-completed-border',
}

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

const currentYear = new Date().getFullYear()

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - 2 + i),
    label: String(currentYear - 2 + i),
}))

const MONTH_OPTIONS = MONTH_NAMES.slice(1).map((name, i) => ({
    value: String(i + 1),
    label: name,
}))

const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'All', label: 'All' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Submitted', label: 'Submitted' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Finished', label: 'Finished' },
]

// ─── FilterBar Config ───────────────────────────────────────

const FILTER_CONFIG: FilterFieldConfig[] = [
    {
        key: 'year',
        label: 'Year',
        type: 'select',
        options: YEAR_OPTIONS,
        placeholder: 'Select...',
    },
    {
        key: 'month',
        label: 'Month',
        type: 'select',
        options: MONTH_OPTIONS,
        placeholder: 'Select...',
    },
    {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: STATUS_OPTIONS,
        placeholder: 'Select...',
    },
]

// ─── Component ──────────────────────────────────────────────

export default function TimesheetListPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { currentUser, fetchCurrentUser } = useTimesheetStore()
    const [timesheets, setTimesheets] = useState<Timesheet[]>([])
    const [loading, setLoading] = useState(true)

    // FilterBar state
    const [filterValues, setFilterValues] = useState<FilterValues>(() =>
        initializeFilterValues(FILTER_CONFIG)
    )

    // Checkbox selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        fetchCurrentUser()
    }, [fetchCurrentUser])

    useEffect(() => {
        if (!currentUser) return

        let isActive = true
        setLoading(true)

        getAllTimesheets(currentUser.id)
            .then((data) => {
                if (isActive) setTimesheets(data)
            })
            .catch(console.error)
            .finally(() => {
                if (isActive) setLoading(false)
            })

        return () => {
            isActive = false
        }
    }, [currentUser])

    // Apply filters
    const filteredTimesheets = useMemo(() => {
        let result = timesheets

        const yearVal = filterValues.year as string
        if (yearVal) {
            result = result.filter(ts => ts.year === Number(yearVal))
        }

        const monthVal = filterValues.month as string
        if (monthVal) {
            result = result.filter(ts => ts.month === Number(monthVal))
        }

        const statusVal = filterValues.status as string
        if (statusVal && statusVal !== 'All') {
            if (statusVal === 'Approved') {
                result = result.filter(ts => ['Approved', 'Approved_By_TeamLead'].includes(ts.status))
            } else {
                result = result.filter(ts => ts.status === statusVal)
            }
        }

        return result
    }, [timesheets, filterValues])

    const handleApplyFilters = useCallback((_values: FilterValues) => {
        // Filtering is automatically applied via useMemo; this keeps the Go button working
    }, [])

    const handleView = (ts: Timesheet) => {
        navigate(`/timesheet?month=${ts.month}&year=${ts.year}`)
    }

    // ─── Selection Config ───────────────────────────────────
    const selectionConfig: SelectionConfig = useMemo(() => ({
        enabled: true,
        mode: 'multiple' as const,
        selectedIds,
        onSelectionChange: setSelectedIds,
        getRowId: (row: Timesheet) => row.id,
    }), [selectedIds])

    // ─── Column Definitions (DataTable format) ──────────────
    const columns: DataTableColumn<Timesheet>[] = useMemo(() => [
        {
            key: 'period',
            labelKey: 'timesheets.table.period',
            width: 200,
            minWidth: 140,
            render: (_value: unknown, row: Timesheet) => (
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{MONTH_NAMES[row.month]} {row.year}</span>
                </div>
            ),
        },
        {
            key: 'status',
            labelKey: 'timesheets.table.status',
            width: 150,
            minWidth: 100,
            render: (_value: unknown, row: Timesheet) => (
                <Badge
                    className={`${statusColors[row.status] || statusColors.Draft} border`}
                    variant="secondary"
                >
                    {row.status.replace(/_/g, ' ')}
                </Badge>
            ),
        },
        {
            key: 'totalHours',
            labelKey: 'timesheets.table.totalHours',
            width: 120,
            minWidth: 80,
            render: (_value: unknown, row: Timesheet) => (
                <span className="font-semibold tabular-nums">{(row.totalHours || 0).toFixed(1)}h</span>
            ),
        },
        {
            key: 'entries',
            labelKey: 'timesheets.table.entries',
            width: 110,
            minWidth: 80,
            render: (_value: unknown, row: Timesheet) => (
                <span className="text-muted-foreground">{row.entries.length} entries</span>
            ),
        },
        {
            key: 'submitDate',
            labelKey: 'timesheets.table.submitted',
            width: 150,
            minWidth: 100,
            render: (_value: unknown, row: Timesheet) => (
                <span className="text-muted-foreground text-sm">
                    {row.submitDate ? format(new Date(row.submitDate), 'MMM dd, yyyy') : '—'}
                </span>
            ),
        },
        {
            key: 'approveDate',
            labelKey: 'timesheets.table.approved',
            width: 150,
            minWidth: 100,
            render: (_value: unknown, row: Timesheet) => (
                <span className="text-muted-foreground text-sm">
                    {row.approveDate ? format(new Date(row.approveDate), 'MMM dd, yyyy') : '—'}
                </span>
            ),
        },
        {
            key: 'actions',
            labelKey: 'timesheets.table.actions',
            width: 150,
            minWidth: 100,
            render: (_value: unknown, row: Timesheet) => (
                <div className="flex items-center gap-1">
                    {row.status !== 'Draft' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/timesheet?month=${row.month}&year=${row.year}&showHistory=true`)
                            }}
                            title="View Audit History"
                        >
                            <History className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/timesheet?month=${row.month}&year=${row.year}`)
                        }}
                    >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                    </Button>
                </div>
            ),
        },
    ], [navigate])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('timesheets.title')}</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {t('timesheets.description')}
                    </p>
                </div>
                <Button onClick={() => navigate('/timesheet')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    {t('timesheets.logTimesheet')}
                </Button>
            </div>

            {/* FilterBar */}
            <FilterBar
                config={FILTER_CONFIG}
                values={filterValues}
                onChange={setFilterValues}
                onApply={handleApplyFilters}
                isLoading={loading}
            />

            {/* Table Card — wraps toolbar + table like Projects page */}
            <div className="bg-card border-0 shadow-sm rounded-xl overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h2 className="text-sm font-semibold">
                        {t('timesheets.title')}{' '}
                        <span className="text-primary">({filteredTimesheets.length})</span>
                    </h2>
                </div>

                {/* DataTable */}
                <DataTable<Timesheet>
                    data={filteredTimesheets}
                    columns={columns}
                    isLoading={loading}
                    onRowClick={handleView}
                    selection={selectionConfig}
                    emptyMessageKey="timesheets.noTimesheets"
                    showFooter={false}
                    variant="borderless"
                    className="border-0 rounded-none"
                />
            </div>
        </div>
    )
}
