import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Calendar, Eye, History, FileText, Download, SlidersHorizontal, ArrowUp, Settings } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table'
import { FilterBar, type FilterFieldConfig, type FilterValues, initializeFilterValues } from '@/shared/components/filterbar'
import { ColumnSettingsDialog, type ColumnSetting } from '@/shared/components/dialogs'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import { getAllTimesheets } from '@/features/timesheet/api/timesheet-api'
import type { Timesheet } from '@/shared/types'

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

// ─── Column Definitions ─────────────────────────────────────

interface ColumnDef {
    key: string
    label: string
    align?: 'left' | 'right'
    defaultWidth: string
    renderHead: () => React.ReactNode
    renderCell: (ts: Timesheet, navigate: ReturnType<typeof useNavigate>) => React.ReactNode
}

const ALL_COLUMNS: ColumnDef[] = [
    {
        key: 'period',
        label: 'Period',
        defaultWidth: '19%',
        renderHead: () => 'Period',
        renderCell: (ts) => (
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {MONTH_NAMES[ts.month]} {ts.year}
            </div>
        ),
    },
    {
        key: 'status',
        label: 'Status',
        defaultWidth: '13%',
        renderHead: () => 'Status',
        renderCell: (ts) => (
            <Badge
                className={`${statusColors[ts.status] || statusColors.Draft} border`}
                variant="secondary"
            >
                {ts.status.replace(/_/g, ' ')}
            </Badge>
        ),
    },
    {
        key: 'totalHours',
        label: 'Total Hours',
        align: 'right',
        defaultWidth: '11%',
        renderHead: () => 'Total Hours',
        renderCell: (ts) => (
            <span className="font-semibold tabular-nums">{(ts.totalHours || 0).toFixed(1)}h</span>
        ),
    },
    {
        key: 'entries',
        label: 'Entries',
        defaultWidth: '9%',
        renderHead: () => 'Entries',
        renderCell: (ts) => (
            <span className="text-muted-foreground">{ts.entries.length} entries</span>
        ),
    },
    {
        key: 'submitted',
        label: 'Submitted',
        defaultWidth: '14%',
        renderHead: () => 'Submitted',
        renderCell: (ts) => (
            <span className="text-muted-foreground text-sm">
                {ts.submitDate ? format(new Date(ts.submitDate), 'MMM dd, yyyy') : '—'}
            </span>
        ),
    },
    {
        key: 'approved',
        label: 'Approved',
        defaultWidth: '14%',
        renderHead: () => 'Approved',
        renderCell: (ts) => (
            <span className="text-muted-foreground text-sm">
                {ts.approveDate ? format(new Date(ts.approveDate), 'MMM dd, yyyy') : '—'}
            </span>
        ),
    },
    {
        key: 'actions',
        label: 'Actions',
        align: 'right',
        defaultWidth: '17%',
        renderHead: () => 'Actions',
        renderCell: (ts, navigate) => (
            <div className="flex items-center justify-end gap-1">
                {ts.status !== 'Draft' && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/timesheet?month=${ts.month}&year=${ts.year}&showHistory=true`)
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
                        navigate(`/timesheet?month=${ts.month}&year=${ts.year}`)
                    }}
                >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                </Button>
            </div>
        ),
    },
]

const DEFAULT_COLUMN_SETTINGS: ColumnSetting[] = ALL_COLUMNS.map(c => ({
    key: c.key,
    label: c.label,
    visible: true,
}))

// ─── Column Resize (pure DOM, no React re-renders during drag) ──

function useColumnResize() {
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
        e.preventDefault()
        e.stopPropagation()

        const th = (e.target as HTMLElement).closest('th')
        if (!th) return
        const nextTh = th.nextElementSibling as HTMLElement | null
        if (!nextTh) return

        // Freeze ALL columns to their current pixel widths so totals stay constant
        const row = th.parentElement
        if (row) {
            Array.from(row.children).forEach((cell) => {
                const el = cell as HTMLElement
                el.style.width = `${el.offsetWidth}px`
            })
        }

        const startX = e.clientX
        const startWidth = th.offsetWidth
        const nextStartWidth = nextTh.offsetWidth
        const MIN_COL = 60

        const onMouseMove = (ev: MouseEvent) => {
            const delta = ev.clientX - startX
            const newWidth = startWidth + delta
            const newNextWidth = nextStartWidth - delta
            if (newWidth < MIN_COL || newNextWidth < MIN_COL) return
            th.style.width = `${newWidth}px`
            nextTh.style.width = `${newNextWidth}px`
        }

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }, [])

    return handleMouseDown
}

// ─── Component ──────────────────────────────────────────────

export default function TimesheetListPage() {
    const navigate = useNavigate()
    const { currentUser, fetchCurrentUser } = useTimesheetStore()
    const [timesheets, setTimesheets] = useState<Timesheet[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // FilterBar state
    const [filterValues, setFilterValues] = useState<FilterValues>(() =>
        initializeFilterValues(FILTER_CONFIG)
    )

    // Column settings state (order + visibility)
    const [columnSettings, setColumnSettings] = useState<ColumnSetting[]>(DEFAULT_COLUMN_SETTINGS)
    const [isColSettingsOpen, setIsColSettingsOpen] = useState(false)

    // Column resize (pure DOM)
    const handleColResize = useColumnResize()

    // Derived ordered + visible columns
    const visibleColumns = useMemo(() => {
        return columnSettings
            .filter(s => s.visible)
            .map(s => ALL_COLUMNS.find(c => c.key === s.key)!)
            .filter(Boolean)
    }, [columnSettings])

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

    // ─── Selection Handlers ─────────────────────────────────

    const allSelected = filteredTimesheets.length > 0 && filteredTimesheets.every(ts => selectedIds.has(ts.id))

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(filteredTimesheets.map(ts => ts.id)))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleSelectRow = (id: string, checked: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (checked) {
                next.add(id)
            } else {
                next.delete(id)
            }
            return next
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Timesheet Worklist</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        View and manage your timesheet submissions
                    </p>
                </div>
                <Button onClick={() => navigate('/timesheet')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Log Timesheet
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

            {/* Table Card */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    {/* Table Toolbar */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <h2 className="text-sm font-semibold">
                            Timesheets <span className="text-primary">({filteredTimesheets.length})</span>
                        </h2>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" title="Document" disabled>
                                <FileText className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Download" disabled>
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Sort" disabled>
                                <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                title="Column Settings"
                                onClick={() => setIsColSettingsOpen(true)}
                            >
                                <Settings className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-muted-foreground">Loading timesheets...</div>
                        </div>
                    ) : filteredTimesheets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
                            <h3 className="font-medium text-lg">No timesheets found</h3>
                            <p className="text-muted-foreground text-sm mt-1">
                                Try adjusting your filters or log a new timesheet.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden">
                            <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead style={{ width: '3%' }}>
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                            />
                                        </TableHead>
                                        {visibleColumns.map((col, idx) => {
                                            const isLast = idx === visibleColumns.length - 1
                                            return (
                                                <TableHead
                                                    key={col.key}
                                                    className={`font-semibold relative select-none ${col.align === 'right' ? 'text-right' : ''}`}
                                                    style={{ width: col.defaultWidth }}
                                                >
                                                    {col.renderHead()}
                                                    {/* Resize handle — hidden on last column */}
                                                    {!isLast && (
                                                        <span
                                                            className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize group/resize z-10 flex items-center justify-center"
                                                            onMouseDown={handleColResize}
                                                        >
                                                            <span className="w-[2px] h-3/5 rounded-full bg-border group-hover/resize:bg-primary/60 group-active/resize:bg-primary transition-colors" />
                                                        </span>
                                                    )}
                                                </TableHead>
                                            )
                                        })}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTimesheets.map((ts) => (
                                        <TableRow key={ts.id} className="cursor-pointer" onClick={() => handleView(ts)}>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedIds.has(ts.id)}
                                                    onCheckedChange={(checked) => handleSelectRow(ts.id, !!checked)}
                                                />
                                            </TableCell>
                                            {visibleColumns.map(col => (
                                                <TableCell
                                                    key={col.key}
                                                    className={col.align === 'right' ? 'text-right' : ''}
                                                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                >
                                                    {col.renderCell(ts, navigate)}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Column Settings Dialog (reorder + visibility) */}
            <ColumnSettingsDialog
                open={isColSettingsOpen}
                onClose={() => setIsColSettingsOpen(false)}
                columns={columnSettings}
                onApply={setColumnSettings}
            />
        </div >
    )
}
