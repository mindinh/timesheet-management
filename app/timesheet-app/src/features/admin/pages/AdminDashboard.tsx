import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, Users, ClipboardCheck, ArrowRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { getAllProjects } from '@/features/projects/api/project-api'
import { getPotentialApprovers } from '@/features/auth/api/auth-api'
import { useApprovalStore } from '@/features/approvals/store/approvalStore'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'

export default function AdminDashboard() {
    const navigate = useNavigate()
    const { currentUser, fetchCurrentUser } = useTimesheetStore()
    const { timesheets, fetchApprovableTimesheets } = useApprovalStore()
    const [projectCount, setProjectCount] = useState(0)
    const [userCount, setUserCount] = useState(0)

    useEffect(() => {
        if (!currentUser) fetchCurrentUser()
    }, [currentUser, fetchCurrentUser])

    useEffect(() => {
        if (currentUser) {
            fetchApprovableTimesheets()
            getAllProjects().then(data => setProjectCount(data.length)).catch(() => { })
            getPotentialApprovers().then(data => setUserCount(data.length)).catch(() => { })
        }
    }, [currentUser, fetchApprovableTimesheets])

    const pendingCount = timesheets.filter(ts => ts.status === 'Submitted' || ts.status === 'Approved_By_TeamLead').length

    const cards = [
        {
            title: 'Total Projects',
            value: projectCount,
            icon: FolderKanban,
            color: 'text-sap-informative',
            bg: 'bg-sap-informative/10',
            action: () => navigate('/projects'),
            actionLabel: 'Manage Projects',
        },
        {
            title: 'Active Users',
            value: userCount,
            icon: Users,
            color: 'text-sap-positive',
            bg: 'bg-sap-positive/10',
        },
        {
            title: 'Pending Approvals',
            value: pendingCount,
            icon: ClipboardCheck,
            color: pendingCount > 0 ? 'text-sap-critical' : 'text-sap-positive',
            bg: pendingCount > 0 ? 'bg-sap-critical/10' : 'bg-sap-positive/10',
            action: () => navigate('/approvals'),
            actionLabel: 'Review Timesheets',
        },
    ]

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">System overview and management</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                    <div key={card.title} className="rounded-xl border bg-card p-6 flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                                <p className="text-3xl font-bold mt-1">{card.value}</p>
                            </div>
                            <div className={`p-2.5 rounded-lg ${card.bg}`}>
                                <card.icon className={`h-5 w-5 ${card.color}`} />
                            </div>
                        </div>
                        {card.action && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-4 w-fit -ml-2 text-muted-foreground hover:text-foreground"
                                onClick={card.action}
                            >
                                {card.actionLabel}
                                <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

