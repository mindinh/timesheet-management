import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, ArrowRight, Layers } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { getAllProjects } from '@/features/projects/api/project-api'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'

import { AdminSyncButton } from '../components/AdminSyncButton'
import { AdminExportPanel } from '../components/AdminExportPanel'
import { AdminExportHistory } from '../components/AdminExportHistory'
import { AdminStatsPanel } from '../components/AdminStatsPanel'
import { AdminChartsPanel } from '../components/AdminChartsPanel'

export default function AdminDashboard() {
    const navigate = useNavigate()
    const { currentUser, fetchCurrentUser } = useTimesheetStore()
    const [projectCount, setProjectCount] = useState(0)
    const [exportRefreshTrigger, setExportRefreshTrigger] = useState(0)

    useEffect(() => {
        if (!currentUser) fetchCurrentUser()
    }, [currentUser, fetchCurrentUser])

    useEffect(() => {
        if (currentUser) {
            getAllProjects().then(data => setProjectCount(data.length)).catch(console.error)
        }
    }, [currentUser])


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
            title: 'Batch Submissions',
            value: '-',
            icon: Layers,
            color: 'text-primary',
            bg: 'bg-primary/10',
            action: () => navigate('/admin/batches'),
            actionLabel: 'View Batches',
        },
    ]

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
                    <p className="text-muted-foreground text-sm mt-1">System overview and management</p>
                </div>
                <div>
                    <AdminSyncButton />
                </div>
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

            {/* Dashboard Charts Panel (Status Breakdown, Hours Trend) */}
            <div className="mt-8">
                <AdminChartsPanel />
            </div>

            {/* Dashboard Stats Panel (OT, Missing, Activity) */}
            <div className="mt-8">
                <AdminStatsPanel />
            </div>

            <div className="mt-8">
                <AdminExportPanel onExportComplete={() => setExportRefreshTrigger(prev => prev + 1)} />
            </div>

            <div className="mt-8">
                <AdminExportHistory refreshTrigger={exportRefreshTrigger} />
            </div>
        </div>
    )
}


