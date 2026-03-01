import cds from '@sap/cds'

/**
 * Cache public holidays per year to avoid excessive API calls.
 */
const publicHolidaysCache: Record<number, Set<string>> = {}

async function getVietnamPublicHolidays(year: number): Promise<Set<string>> {
    if (publicHolidaysCache[year]) {
        return publicHolidaysCache[year]
    }

    const holidays = new Set<string>()
    try {
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/VN`)
        if (response.ok) {
            const data = (await response.json()) as any[]
            data.forEach(h => {
                if (h.date) holidays.add(h.date)
            })
        }
    } catch (e) {
        console.error(`Failed to fetch VN public holidays for ${year}`, e)
    }

    publicHolidaysCache[year] = holidays
    return holidays
}

export class AdminDashboardHandler {
    private srv: any

    constructor(srv: any) {
        this.srv = srv
    }

    register() {
        this.srv.on('getDashboardStats', this.onGetDashboardStats.bind(this))
    }

    private async onGetDashboardStats(req: any) {
        const { month, year } = req.data as { month: number, year: number }
        if (!month || !year) return req.reject(400, 'month and year are required')

        const db = cds.db || await cds.connect.to('db')
        const { Timesheet, TimesheetEntry, User, Project, BatchHistory, ApprovalHistory } = db.entities('sap.timesheet')

        // 1. OT Logic
        const holidays = await getVietnamPublicHolidays(year)

        const allUsers = await SELECT.from(User).columns('ID', 'firstName', 'lastName', 'email', 'isActive')
        const allUsersMap = new Map<string, any>(allUsers.map((u: any) => [u.ID, u]))
        const activeUsers = allUsers.filter((u: any) => u.isActive)

        const timesheets = await SELECT.from(Timesheet).where({ month, year })
        const timesheetIds = timesheets.map((t: any) => t.ID)
        const tsToUserMap = new Map<string, string>(timesheets.map((t: any) => [t.ID, t.user_ID]))

        let otUsers: Record<string, { user: any, otHours: number }> = {}

        if (timesheetIds.length > 0) {
            const entries = await SELECT.from(TimesheetEntry).where({ timesheet_ID: { in: timesheetIds } })

            for (const entry of entries) {
                const hours = entry.approvedHours !== null && entry.approvedHours !== undefined ? Number(entry.approvedHours) : Number(entry.loggedHours || 0)
                if (hours <= 0) continue

                const dateObj = new Date(entry.date)
                const dayOfWeek = dateObj.getDay() // 0 = Sunday, 6 = Saturday
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                const isHoliday = holidays.has(entry.date)

                let dailyOT = 0
                if (isWeekend || isHoliday) {
                    dailyOT = hours // All hours count as OT
                } else if (hours > 8) {
                    dailyOT = hours - 8
                }

                if (dailyOT > 0) {
                    const userId = tsToUserMap.get(entry.timesheet_ID)
                    if (userId) {
                        if (!otUsers[userId]) {
                            otUsers[userId] = {
                                user: allUsersMap.get(userId),
                                otHours: 0
                            }
                        }
                        otUsers[userId].otHours += dailyOT
                    }
                }
            }
        }

        const otResult = Object.values(otUsers).sort((a, b) => b.otHours - a.otHours)

        // 2. Missing Logic
        const usersWithTimesheet = new Set(timesheets.map((t: any) => t.user_ID))
        const missingUsers = activeUsers.filter((u: any) => !usersWithTimesheet.has(u.ID))

        // 3. Audit Logic
        // Fetch last 15 Batch History events
        const batchLogs = await SELECT.from(BatchHistory)
            .columns('ID', 'action', 'comment', 'timestamp', 'actor_ID', 'batch_ID')
            .orderBy('timestamp desc')
            .limit(15)

        // Fetch last 15 Approval History events
        const appLogs = await SELECT.from(ApprovalHistory)
            .columns('ID', 'action', 'comment', 'timestamp', 'actor_ID', 'timesheet_ID')
            .orderBy('timestamp desc')
            .limit(15)

        const recentActivity = []

        for (const log of batchLogs) {
            const actor = (allUsersMap.get(log.actor_ID) || { firstName: 'System', lastName: '' }) as { firstName: string; lastName: string }
            recentActivity.push({
                id: log.ID,
                type: 'Batch',
                action: log.action,
                message: log.comment || `Batch ${log.action}`,
                timestamp: log.timestamp,
                actorName: `${actor.firstName} ${actor.lastName}`.trim(),
                referenceId: log.batch_ID
            })
        }

        for (const log of appLogs) {
            const actor = (allUsersMap.get(log.actor_ID) || { firstName: 'System', lastName: '' }) as { firstName: string; lastName: string }
            let msg = log.comment
            if (!msg) {
                if (log.action === 'Modified') msg = `Modified a timesheet entry`
                else msg = `Timesheet ${log.action}`
            }
            recentActivity.push({
                id: log.ID,
                type: 'Timesheet',
                action: log.action,
                message: msg,
                timestamp: log.timestamp,
                actorName: `${actor.firstName} ${actor.lastName}`.trim(),
                referenceId: log.timesheet_ID
            })
        }

        recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        const finalActivity = recentActivity.slice(0, 15)

        // 4. Chart Logic: Timesheet Status Breakdown (Current Month)
        const timesheetStatusChart = [
            { name: 'Draft', value: 0 },
            { name: 'Submitted', value: 0 },
            { name: 'Approved', value: 0 },
            { name: 'Finished', value: 0 },
            { name: 'Rejected', value: 0 }
        ]

        timesheets.forEach((ts: any) => {
            let statusName = ts.status
            if (statusName === 'Approved_By_TeamLead') statusName = 'Approved'

            const point = timesheetStatusChart.find(p => p.name === statusName)
            if (point) {
                point.value += 1
            }
        })

        // 5. Chart Logic: Monthly Hours Trend (Last 6 Months)
        const monthlyHoursTrend: { name: string; hours: number; __month: number; __year: number }[] = []
        // We'll calculate the last 6 months including the requested month
        for (let i = 5; i >= 0; i--) {
            let targetMonth = month - i
            let targetYear = year
            if (targetMonth <= 0) {
                targetMonth += 12
                targetYear -= 1
            }
            monthlyHoursTrend.push({
                name: `${String(targetMonth).padStart(2, '0')}/${String(targetYear).slice(-2)}`,
                hours: 0,
                __month: targetMonth,
                __year: targetYear
            })
        }

        // Fetch all timesheets from the past 6 months to calculate sum
        const sixMonthsAgo = monthlyHoursTrend[0]
        const recentTimesheets = await SELECT.from(Timesheet).where(
            `year > ${sixMonthsAgo.__year} OR (year = ${sixMonthsAgo.__year} AND month >= ${sixMonthsAgo.__month})`
        )
        const recentTimesheetIds = recentTimesheets.map((t: any) => t.ID)
        const recentTsMap = new Map((recentTimesheets as any[]).map(t => [t.ID, t]))

        if (recentTimesheetIds.length > 0) {
            const allRecentEntries = await SELECT.from(TimesheetEntry).where({ timesheet_ID: { in: recentTimesheetIds } })
            for (const entry of allRecentEntries) {
                const ts = recentTsMap.get(entry.timesheet_ID)
                if (ts) {
                    const matchedMonth = monthlyHoursTrend.find(m => m.__month === ts.month && m.__year === ts.year)
                    if (matchedMonth) {
                        const h = entry.approvedHours !== null && entry.approvedHours !== undefined ? Number(entry.approvedHours) : Number(entry.loggedHours || 0)
                        matchedMonth.hours += h
                    }
                }
            }
        }

        // Remove internal fields before sending to frontend
        const finalMonthlyTrend = monthlyHoursTrend.map(({ name, hours }) => ({ name, hours: Math.round(hours) }))

        // 6. Chart Logic: Hours by Project (Current Month)
        const projects = await SELECT.from(Project).columns('ID', 'name')
        const projectMap = new Map(projects.map((p: any) => [p.ID, p.name]))
        const projectHoursMap = new Map<string, number>()

        // 7. Chart Logic: Top 5 Employees (Current Month)
        const topEmployeesMap = new Map<string, number>()

        if (timesheetIds.length > 0) {
            const currentMonthEntries = await SELECT.from(TimesheetEntry).where({ timesheet_ID: { in: timesheetIds } })
            for (const entry of currentMonthEntries) {
                const h = entry.approvedHours !== null && entry.approvedHours !== undefined ? Number(entry.approvedHours) : Number(entry.loggedHours || 0)
                if (h > 0) {
                    // Aggregate by project
                    if (entry.project_ID) {
                        const currentProjHours = projectHoursMap.get(entry.project_ID) || 0
                        projectHoursMap.set(entry.project_ID, currentProjHours + h)
                    }

                    // Aggregate by employee
                    const userId = tsToUserMap.get(entry.timesheet_ID)
                    if (userId) {
                        const currentEmpHours = topEmployeesMap.get(userId) || 0
                        topEmployeesMap.set(userId, currentEmpHours + h)
                    }
                }
            }
        }

        const projectHoursChart = Array.from(projectHoursMap.entries()).map(([id, hours]) => ({
            name: projectMap.get(id) || 'Unknown Project',
            value: Number(hours.toFixed(1))
        })).sort((a, b) => b.value - a.value)

        const topEmployeesChart = Array.from(topEmployeesMap.entries()).map(([userId, hours]) => {
            const user = allUsersMap.get(userId)
            return {
                name: user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown',
                hours: Number(hours.toFixed(1)),
                email: user?.email
            }
        }).sort((a, b) => b.hours - a.hours).slice(0, 5)

        return JSON.stringify({
            overtimeUsers: otResult,
            missingTimesheetUsers: missingUsers,
            recentActivity: finalActivity,
            timesheetStatusChart: timesheetStatusChart.filter(c => c.value > 0), // Only return status with > 0 timesheets
            monthlyHoursTrend: finalMonthlyTrend,
            projectHoursChart,
            topEmployeesChart
        })
    }
}
