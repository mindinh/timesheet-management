import { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, Upload, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { triggerExportToExcel, runReport, clearDatabase } from '../api/admin-api'
import { getAllProjects } from '@/features/projects/api/project-api'
import { getPotentialApprovers } from '@/features/auth/api/auth-api'

export function AdminExportPanel({ onExportComplete }: { onExportComplete?: () => void }) {
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [isClearing, setIsClearing] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

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

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        try {
            const reader = new FileReader()
            reader.onload = async (event) => {
                const base64Data = event.target?.result as string
                try {
                    const result = await runReport(base64Data)
                    alert('Import Successful:\n' + result)
                    if (onExportComplete) onExportComplete() // trigger refresh
                } catch (err: any) {
                    alert(`Import Failed:\n${err.message || 'Unknown error'}`)
                } finally {
                    setIsImporting(false)
                    // Reset input
                    if (fileInputRef.current) fileInputRef.current.value = ''
                }
            }
            reader.readAsDataURL(file)
        } catch (error: any) {
            alert(`File reading failed:\n${error.message}`)
            setIsImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleClearDatabase = async () => {
        const confirmed = window.confirm(
            '⚠️ WARNING: This will DELETE ALL DATA from the database!\n\n' +
            'This includes: Users, Projects, Tasks, Timesheets, Entries, Batches, and all history records.\n\n' +
            'This action cannot be undone. Are you sure?'
        )
        if (!confirmed) return

        setIsClearing(true)
        try {
            const result = await clearDatabase()
            alert('✅ ' + result)
            if (onExportComplete) onExportComplete()
        } catch (err: any) {
            alert(`Clear Database Failed:\n${err.message || 'Unknown error'}`)
        } finally {
            setIsClearing(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-sap-informative" />
                    Advanced Timesheet Export & Import
                </CardTitle>
                <CardDescription>
                    Export timesheet records across the entire organization with custom filters or import data to seed the database.
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
            <CardFooter className="bg-muted/50 py-3 flex flex-wrap justify-between gap-2">
                <div className="flex gap-2">
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    <Button variant="outline" onClick={handleImportClick} disabled={isImporting} className="gap-2">
                        <Upload className="w-4 h-4" />
                        {isImporting ? 'Importing...' : 'Import Data from Excel'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleClearDatabase}
                        disabled={isClearing}
                        className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                        <Trash2 className="w-4 h-4" />
                        {isClearing ? 'Clearing...' : 'Clear Database'}
                    </Button>
                </div>
                <Button onClick={handleExport} disabled={isExporting} className="gap-2">
                    <Download className="w-4 h-4" />
                    {isExporting ? 'Generating...' : 'Export to Excel'}
                </Button>
            </CardFooter>
        </Card>
    )
}
