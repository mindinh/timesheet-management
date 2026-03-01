import { useState, useEffect } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { triggerExportToExcel } from '../api/admin-api'
import { getAllProjects } from '@/features/projects/api/project-api'
import { getPotentialApprovers } from '@/features/auth/api/auth-api'

export function AdminExportPanel({ onExportComplete }: { onExportComplete?: () => void }) {
    const [isExporting, setIsExporting] = useState(false)

    // Form state
    const [year, setYear] = useState<string>(new Date().getFullYear().toString())
    const [month, setMonth] = useState<string>('')
    const [userId, setUserId] = useState<string>('all')
    const [projectId, setProjectId] = useState<string>('all')
    const [fromDate, setFromDate] = useState<string>('')
    const [toDate, setToDate] = useState<string>('')

    // Data for dropdowns
    const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([])
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([])

    useEffect(() => {
        // Load users and projects for the filter dropdowns
        Promise.all([
            getPotentialApprovers().catch(() => []), // all users basically
            getAllProjects().catch(() => [])
        ]).then(([usersData, projectsData]) => {
            setUsers(usersData)
            setProjects(projectsData)
        })
    }, [])

    const handleExport = async () => {
        if (!year) {
            alert('Year is required')
            return
        }

        setIsExporting(true)
        try {
            await triggerExportToExcel({
                year: parseInt(year),
                month: month ? parseInt(month) : undefined,
                userId: userId !== 'all' ? userId : null,
                projectId: projectId !== 'all' ? projectId : null,
                from: fromDate || null,
                to: toDate || null,
            })

            alert('Export Successful:\nThe Excel file is downloading and history has been saved.')
            if (onExportComplete) onExportComplete()
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'An error occurred during export.'
            alert(`Export Failed:\n${msg}`)
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-sap-informative" />
                    Advanced Timesheet Export
                </CardTitle>
                <CardDescription>
                    Export timesheet records across the entire organization with custom filters.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                    {/* Year & Month */}
                    <div className="space-y-2">
                        <Label>Year *</Label>
                        <Input
                            type="number"
                            value={year}
                            onChange={e => setYear(e.target.value)}
                            placeholder="e.g. 2026"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Month (Optional)</Label>
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Months" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">All Months</SelectItem>
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range Override */}
                    <div className="space-y-2">
                        <Label>Custom Start Date</Label>
                        <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Custom End Date</Label>
                        <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                    </div>

                    {/* User & Project Filters */}
                    <div className="space-y-2">
                        <Label>Filter by User</Label>
                        <Select value={userId} onValueChange={setUserId}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Users" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {users.map(u => (
                                    <SelectItem key={u.id} value={u.id}>
                                        {u.firstName} {u.lastName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Filter by Project</Label>
                        <Select value={projectId} onValueChange={setProjectId}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Projects" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                </div>
            </CardContent>
            <CardFooter className="bg-muted/50 py-3 flex justify-end">
                <Button onClick={handleExport} disabled={isExporting} className="gap-2">
                    <Download className="w-4 h-4" />
                    {isExporting ? 'Generating...' : 'Export to Excel'}
                </Button>
            </CardFooter>
        </Card>
    )
}
