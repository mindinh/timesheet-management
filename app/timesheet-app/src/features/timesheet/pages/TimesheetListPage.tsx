import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Calendar, Eye, Clock, FileText } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import { timesheetsAPI } from '@/shared/lib/api'
import type { Timesheet, TimesheetStatusType } from '@/shared/types'

const STATUS_TABS: { label: string; value: TimesheetStatusType | 'All' }[] = [
    { label: 'All', value: 'All' },
    { label: 'Draft', value: 'Draft' },
    { label: 'Submitted', value: 'Submitted' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Finished', value: 'Finished' },
]

const statusColors: Record<string, string> = {
    Draft: 'bg-muted text-muted-foreground border-border',
    Submitted: 'bg-[color:var(--sap-informative)]/10 text-[color:var(--sap-informative)] border-[color:var(--sap-informative)]/20',
    Approved_By_TeamLead: 'bg-[color:var(--sap-positive)]/10 text-[color:var(--sap-positive)] border-[color:var(--sap-positive)]/20',
    Approved: 'bg-[color:var(--sap-positive)]/10 text-[color:var(--sap-positive)] border-[color:var(--sap-positive)]/20',
    Rejected: 'bg-[color:var(--sap-negative)]/10 text-[color:var(--sap-negative)] border-[color:var(--sap-negative)]/20',
    Finished: 'bg-[color:var(--sap-positive)]/10 text-[color:var(--sap-positive)] border-[color:var(--sap-positive)]/20',
}

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

export default function TimesheetListPage() {
    const navigate = useNavigate()
    const { currentUser, fetchCurrentUser } = useTimesheetStore()
    const [timesheets, setTimesheets] = useState<Timesheet[]>([])
    const [loading, setLoading] = useState(true)
    const [activeFilter, setActiveFilter] = useState<TimesheetStatusType | 'All'>('All')

    useEffect(() => {
        fetchCurrentUser()
    }, [fetchCurrentUser])

    useEffect(() => {
        if (!currentUser) return
        setLoading(true)
        timesheetsAPI.getAll(currentUser.id)
            .then(setTimesheets)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [currentUser])

    const filteredTimesheets = useMemo(() => {
        if (activeFilter === 'All') return timesheets
        return timesheets.filter(ts => ts.status === activeFilter)
    }, [timesheets, activeFilter])

    // Summary stats
    const stats = useMemo(() => {
        const total = timesheets.length
        const draft = timesheets.filter(ts => ts.status === 'Draft').length
        const submitted = timesheets.filter(ts => ts.status === 'Submitted').length
        const approved = timesheets.filter(ts => ['Approved', 'Approved_By_TeamLead'].includes(ts.status)).length
        return { total, draft, submitted, approved }
    }, [timesheets])

    const handleView = (ts: Timesheet) => {
        // Navigate to timesheet page and set the month
        navigate(`/timesheet?month=${ts.month}&year=${ts.year}`)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Timesheets</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        View and manage your timesheet submissions
                    </p>
                </div>
                <Button
                    onClick={() => navigate('/timesheet')}
                    className="bg-primary hover:bg-primary/90"
                >
                    <Calendar className="h-4 w-4 mr-2" />
                    Current Month
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-[color:var(--sap-informative)]/10">
                                <FileText className="h-5 w-5 text-[color:var(--sap-informative)]" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                                <FileText className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Drafts</p>
                                <p className="text-2xl font-bold">{stats.draft}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-[color:var(--sap-informative)]/10">
                                <Clock className="h-5 w-5 text-[color:var(--sap-informative)]" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</p>
                                <p className="text-2xl font-bold">{stats.submitted}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-[color:var(--sap-positive)]/10">
                                <Eye className="h-5 w-5 text-[color:var(--sap-positive)]" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approved</p>
                                <p className="text-2xl font-bold">{stats.approved}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b pb-2">
                {STATUS_TABS.map((tab) => (
                    <Button
                        key={tab.value}
                        variant={activeFilter === tab.value ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveFilter(tab.value)}
                        className={activeFilter === tab.value
                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }
                    >
                        {tab.label}
                        {tab.value !== 'All' && (
                            <span className="ml-1.5 text-xs opacity-70">
                                ({timesheets.filter(ts =>
                                    tab.value === 'Approved'
                                        ? ['Approved', 'Approved_By_TeamLead'].includes(ts.status)
                                        : ts.status === tab.value
                                ).length})
                            </span>
                        )}
                    </Button>
                ))}
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-muted-foreground">Loading timesheets...</div>
                        </div>
                    ) : filteredTimesheets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
                            <h3 className="font-medium text-lg">No timesheets found</h3>
                            <p className="text-muted-foreground text-sm mt-1">
                                {activeFilter === 'All'
                                    ? 'Start by logging your hours in the current month.'
                                    : `No timesheets with status "${activeFilter}".`
                                }
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="font-semibold">Period</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="font-semibold text-right">Total Hours</TableHead>
                                    <TableHead className="font-semibold">Entries</TableHead>
                                    <TableHead className="font-semibold">Submitted</TableHead>
                                    <TableHead className="font-semibold">Approved</TableHead>
                                    <TableHead className="font-semibold text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTimesheets.map((ts) => (
                                    <TableRow key={ts.id} className="cursor-pointer" onClick={() => handleView(ts)}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                {MONTH_NAMES[ts.month]} {ts.year}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={`${statusColors[ts.status] || statusColors.Draft} border`}
                                                variant="secondary"
                                            >
                                                {ts.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold tabular-nums">
                                            {(ts.totalHours || 0).toFixed(1)}h
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {ts.entries.length} entries
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {ts.submitDate
                                                ? format(new Date(ts.submitDate), 'MMM dd, yyyy')
                                                : '—'
                                            }
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {ts.approveDate
                                                ? format(new Date(ts.approveDate), 'MMM dd, yyyy')
                                                : '—'
                                            }
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); handleView(ts) }}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
