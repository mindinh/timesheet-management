import { useState, useEffect } from 'react'
import { fetchDashboardStats, type DashboardStats } from '../api/admin-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Clock, UserX, Activity, CalendarDays, ChevronLeft, ChevronRight, UserCircle } from 'lucide-react'
import { format } from 'date-fns'

export function AdminStatsPanel() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Current selection
    const [currentDate, setCurrentDate] = useState(() => new Date())

    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()

    useEffect(() => {
        const loadStats = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const data = await fetchDashboardStats(currentMonth, currentYear)
                setStats(data)
            } catch (err: unknown) {
                console.error("Failed to load dashboard stats", err)
                const msg = err instanceof Error ? err.message : "Failed to load statistics"
                setError(msg)
            } finally {
                setIsLoading(false)
            }
        }
        loadStats()
    }, [currentMonth, currentYear])

    const handlePrevMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    }

    const handleNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    }

    return (
        <div className="space-y-6">
            {/* Header / Month Picker */}
            <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Monthly Statistics</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="font-semibold text-foreground w-32 text-center">
                        {format(currentDate, 'MMMM yyyy')}
                    </span>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground">
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {error ? (
                <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
                    {error}
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center p-12 text-muted-foreground animate-pulse">
                    Loading statistics...
                </div>
            ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Unlogged Timesheets Table */}
                    <Card className="shadow-sm border-border flex flex-col h-full">
                        <CardHeader className="bg-muted/30 border-b border-border py-4">
                            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                <UserX className="h-4 w-4" />
                                Missing Timesheets
                            </CardTitle>
                            <CardDescription>Active users who haven't logged any hours for {format(currentDate, 'MMMM yyyy')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-auto max-h-[300px]">
                            {stats.missingTimesheetUsers.length === 0 ? (
                                <div className="p-6 text-center text-sm text-muted-foreground">
                                    All active users have submitted timesheets!
                                </div>
                            ) : (
                                <ul className="divide-y divide-border/50">
                                    {stats.missingTimesheetUsers.map(user => (
                                        <li key={user.ID} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                                            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold shrink-0 text-xs shadow-sm">
                                                {user.firstName[0]}{user.lastName[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{user.firstName} {user.lastName}</p>
                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                            </div>
                                            <div className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800/30">
                                                Missing
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    {/* Overtime Table */}
                    <Card className="shadow-sm border-border flex flex-col h-full">
                        <CardHeader className="bg-muted/30 border-b border-border py-4">
                            <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                <Clock className="h-4 w-4" />
                                Overtime (OT) Logged
                            </CardTitle>
                            <CardDescription>Users who logged &gt;8h/day or worked on weekends/holidays</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-auto max-h-[300px]">
                            {stats.overtimeUsers.length === 0 ? (
                                <div className="p-6 text-center text-sm text-muted-foreground">
                                    No overtime logged for {format(currentDate, 'MMMM yyyy')}.
                                </div>
                            ) : (
                                <ul className="divide-y divide-border/50">
                                    {stats.overtimeUsers.map(ot => (
                                        <li key={ot.user.ID} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold shrink-0 text-xs shadow-sm">
                                                    {ot.user.firstName[0]}{ot.user.lastName[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">{ot.user.firstName} {ot.user.lastName}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{ot.user.email}</p>
                                                </div>
                                            </div>
                                            <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800/30">
                                                +{ot.otHours.toFixed(1)}h
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    {/* System Activity Feed */}
                    <Card className="md:col-span-2 shadow-sm border-border">
                        <CardHeader className="bg-muted/30 border-b border-border py-4">
                            <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                <Activity className="h-4 w-4" />
                                Recent System Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[400px] overflow-auto">
                            {stats.recentActivity.length === 0 ? (
                                <div className="p-6 text-center text-sm text-muted-foreground">
                                    No recent activity found.
                                </div>
                            ) : (
                                <ul className="divide-y divide-border/50">
                                    {stats.recentActivity.map(activity => (
                                        <li key={activity.id} className="p-4 hover:bg-muted/20 transition-colors flex gap-4">
                                            <div className="shrink-0 mt-0.5">
                                                {activity.type === 'Batch' ? (
                                                    <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded shadow-sm border border-indigo-200">
                                                        <Activity className="h-4 w-4" />
                                                    </div>
                                                ) : (
                                                    <div className="p-1.5 bg-cyan-100 text-cyan-700 rounded shadow-sm border border-cyan-200">
                                                        <UserCircle className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm text-foreground">
                                                    <span className="font-semibold">{activity.actorName}</span>{' '}
                                                    <span className="text-muted-foreground">{activity.message || activity.action}</span>
                                                </p>
                                                <div className="flex items-center gap-2 mt-1 font-mono">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${activity.action === 'Created' ? 'bg-emerald-100 text-emerald-700' :
                                                        activity.action === 'Rejected' ? 'bg-destructive/10 text-destructive' :
                                                            activity.action === 'Finished' || activity.action === 'Approved' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {activity.action}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(activity.timestamp), 'MMM dd, yyyy HH:mm')}
                                                    </span>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : null}
        </div>
    )
}
