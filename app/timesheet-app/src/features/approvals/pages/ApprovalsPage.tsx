import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { CheckSquare, Search } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useApprovalStore } from '@/features/approvals/store/approvalStore'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import { cn } from '@/shared/lib/utils'

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

const statusColors: Record<string, string> = {
    Submitted: 'bg-[color:var(--sap-informative)]/10 text-[color:var(--sap-informative)] border-[color:var(--sap-informative)]/20',
    Approved: 'bg-[color:var(--sap-positive)]/10 text-[color:var(--sap-positive)] border-[color:var(--sap-positive)]/20',
    Rejected: 'bg-[color:var(--sap-negative)]/10 text-[color:var(--sap-negative)] border-[color:var(--sap-negative)]/20',
    Finished: 'bg-[color:var(--sap-positive)]/10 text-[color:var(--sap-positive)] border-[color:var(--sap-positive)]/20',
}

const statusDotColors: Record<string, string> = {
    Submitted: 'bg-[color:var(--sap-informative)]',
    Approved: 'bg-[color:var(--sap-positive)]',
    Rejected: 'bg-[color:var(--sap-negative)]',
    Finished: 'bg-[color:var(--sap-positive)]',
}

const FILTER_TABS = ['All', 'Submitted', 'Approved', 'Rejected'] as const

export default function ApprovalsPage() {
    const navigate = useNavigate()
    const { timesheets, isLoading, filter, setFilter, fetchApprovableTimesheets } = useApprovalStore()
    const { currentUser, fetchCurrentUser } = useTimesheetStore()
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (!currentUser) {
            fetchCurrentUser()
        }
    }, [currentUser, fetchCurrentUser])

    useEffect(() => {
        if (currentUser) {
            fetchApprovableTimesheets()
        }
    }, [currentUser, fetchApprovableTimesheets])

    const filteredTimesheets = useMemo(() => {
        let list = timesheets
        if (filter !== 'All') {
            list = list.filter(ts => ts.status === filter)
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            list = list.filter(ts =>
                ts.user?.firstName?.toLowerCase().includes(q) ||
                ts.user?.lastName?.toLowerCase().includes(q) ||
                ts.user?.email?.toLowerCase().includes(q)
            )
        }
        return list
    }, [timesheets, filter, searchQuery])

    const pendingCount = timesheets.filter(ts => ts.status === 'Submitted').length

    const handleReview = (timesheetId: string) => {
        navigate(`/approvals/${timesheetId}`)
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Timesheet Approvals</h1>
                    {pendingCount > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-[color:var(--sap-informative)] mr-2" />
                            {pendingCount} Pending submission{pendingCount !== 1 ? 's' : ''} requiring your review
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Filter Tabs + Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Filter Tabs */}
                <div className="flex items-center justify-end px-6 pt-4">
                    <div className="flex gap-1 bg-muted rounded-lg p-1">
                        {FILTER_TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab as any)}
                                className={cn(
                                    'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                                    filter === tab
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="px-6 pb-4 pt-4">
                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading...</div>
                    ) : filteredTimesheets.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                            <p className="text-muted-foreground">No timesheets to review</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                                    <th className="text-left py-3 px-2">Employee Name</th>
                                    <th className="text-left py-3 px-2">Period</th>
                                    <th className="text-center py-3 px-2">Total Hours</th>
                                    <th className="text-left py-3 px-2">Submitted Date</th>
                                    <th className="text-center py-3 px-2">Status</th>
                                    <th className="text-center py-3 px-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTimesheets.map(ts => {
                                    const period = `${MONTH_NAMES[ts.month]} ${ts.year}`
                                    const submittedDate = ts.submitDate
                                        ? format(new Date(ts.submitDate), 'yyyy-MM-dd')
                                        : '—'
                                    const initials = ts.user
                                        ? `${ts.user.firstName?.[0] || ''}${ts.user.lastName?.[0] || ''}`
                                        : '??'

                                    return (
                                        <tr key={ts.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                            <td className="py-4 px-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm">
                                                            {ts.user?.firstName} {ts.user?.lastName}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {ts.user?.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-2 text-sm">{period}</td>
                                            <td className="py-4 px-2 text-sm text-center font-semibold">
                                                {(ts.totalHours || 0).toFixed(1)}h
                                            </td>
                                            <td className="py-4 px-2 text-sm">{submittedDate}</td>
                                            <td className="py-4 px-2 text-center">
                                                <span className={cn(
                                                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                                                    statusColors[ts.status] || 'bg-muted text-muted-foreground border-border'
                                                )}>
                                                    <span className={cn(
                                                        'w-1.5 h-1.5 rounded-full',
                                                        statusDotColors[ts.status] || 'bg-muted-foreground'
                                                    )} />
                                                    {ts.status === 'Submitted' ? 'Pending' : ts.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-2 text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleReview(ts.id)}
                                                >
                                                    Review
                                                </Button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                {filteredTimesheets.length > 0 && (
                    <div className="px-6 py-3 border-t border-border text-sm text-muted-foreground">
                        Showing {filteredTimesheets.length} of {timesheets.length} submissions
                    </div>
                )}
            </div>
        </div>
    )
}
