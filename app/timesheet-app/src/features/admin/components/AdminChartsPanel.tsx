import { useState, useEffect } from 'react'
import { fetchDashboardStats, type DashboardStats } from '../api/admin-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import { PieChart as PieChartIcon, BarChart3, Briefcase, UsersRound } from 'lucide-react'

// Beautiful colors for the charts
const STATUS_COLORS: Record<string, string> = {
    'Draft': '#94a3b8',      // slate-400
    'Submitted': '#fbbf24',  // amber-400
    'Approved': '#3b82f6',   // blue-500
    'Finished': '#10b981',   // emerald-500
    'Rejected': '#ef4444',   // red-500
}

const PROJECT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6']

export function AdminChartsPanel() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await fetchDashboardStats(currentMonth, currentYear)
                setStats(data)
            } catch (err: unknown) {
                console.error("Failed to load chart stats", err)
            } finally {
                setIsLoading(false)
            }
        }
        loadStats()
    }, [currentMonth, currentYear])

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                <Card className="h-80 bg-muted/20" />
                <Card className="h-80 bg-muted/20" />
            </div>
        )
    }

    if (!stats) return null

    const hasPieData = stats.timesheetStatusChart && stats.timesheetStatusChart.length > 0
    const hasBarData = stats.monthlyHoursTrend && stats.monthlyHoursTrend.length > 0
    const hasProjectData = stats.projectHoursChart && stats.projectHoursChart.length > 0
    const hasTopEmpData = stats.topEmployeesChart && stats.topEmployeesChart.length > 0

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown Pie Chart */}
            <Card className="shadow-sm border-border">
                <CardHeader className="bg-muted/30 border-b border-border py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <PieChartIcon className="h-4 w-4 text-primary" />
                        Timesheet Status Breakdown
                    </CardTitle>
                    <CardDescription>Current month distribution</CardDescription>
                </CardHeader>
                <CardContent className="p-4 flex items-center justify-center min-h-[300px]">
                    {!hasPieData ? (
                        <p className="text-sm text-muted-foreground">No timesheet data available for this month.</p>
                    ) : (
                        <ResponsiveContainer width={300} height={300}>
                            <PieChart>
                                <Pie
                                    data={stats.timesheetStatusChart}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.timesheetStatusChart.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#cbd5e1'} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    formatter={(value: unknown) => [`${value} Timesheets`, 'Count']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Monthly Hours Trend Bar Chart */}
            <Card className="shadow-sm border-border">
                <CardHeader className="bg-muted/30 border-b border-border py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        System-wide Logged Hours
                    </CardTitle>
                    <CardDescription>Trend over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-8 flex items-center justify-center min-h-[300px]">
                    {!hasBarData ? (
                        <p className="text-sm text-muted-foreground">No historical data available.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={stats.monthlyHoursTrend.slice().reverse()}>
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    dx={-10}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                                    formatter={(value: unknown) => [`${value} Hours`, 'Total Logged']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar
                                    dataKey="hours"
                                    fill="var(--color-primary)"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={50}
                                >
                                    {stats.monthlyHoursTrend.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill="#3b82f6" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Project Logged Hours Pie Chart */}
            <Card className="shadow-sm border-border">
                <CardHeader className="bg-muted/30 border-b border-border py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        Logged Hours by Project
                    </CardTitle>
                    <CardDescription>Current month distribution</CardDescription>
                </CardHeader>
                <CardContent className="p-4 flex items-center justify-center min-h-[300px]">
                    {!hasProjectData ? (
                        <p className="text-sm text-muted-foreground">No project data available for this month.</p>
                    ) : (
                        <ResponsiveContainer width={300} height={300}>
                            <PieChart>
                                <Pie
                                    data={stats.projectHoursChart}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={0}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {stats.projectHoursChart.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={PROJECT_COLORS[index % PROJECT_COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    formatter={(value: unknown) => [`${value} Hours`, 'Logged']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Top 5 Employees Bar Chart */}
            <Card className="shadow-sm border-border">
                <CardHeader className="bg-muted/30 border-b border-border py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <UsersRound className="h-4 w-4 text-primary" />
                        Top 5 Employees
                    </CardTitle>
                    <CardDescription>Most hours logged this month</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-8 flex items-center justify-center min-h-[300px]">
                    {!hasTopEmpData ? (
                        <p className="text-sm text-muted-foreground">No employee data available.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart
                                data={stats.topEmployeesChart}
                                layout="vertical"
                                margin={{ left: 20 }}
                            >
                                <XAxis
                                    type="number"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                    width={120}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                                    formatter={(value: unknown) => [`${value} Hours`, 'Total Logged']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar
                                    dataKey="hours"
                                    fill="var(--color-primary)"
                                    radius={[0, 4, 4, 0]}
                                    barSize={20}
                                >
                                    {stats.topEmployeesChart.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill="#8b5cf6" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
