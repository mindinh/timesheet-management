import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { addMonths, subMonths, format } from 'date-fns'
import { CalendarHeader } from '@/features/timesheet/components/CalendarHeader'
import { TimesheetStats } from '@/features/timesheet/components/TimesheetStats'
import { DailyEntryList } from '@/features/timesheet/components/DailyEntryList'
import { DailyLogDialog } from '@/features/timesheet/components/DailyLogDialog'
import { TimesheetFooter } from '@/features/timesheet/components/TimesheetFooter'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import { getUserWithManager, getPotentialApprovers } from '@/features/auth/api/auth-api'
import { exportToExcel } from '@/features/timesheet/api/timesheet-api'
import type { TimesheetEntry } from '@/shared/types'
import { AlertTriangle, History } from 'lucide-react'
import { AuditHistoryDialog } from '@/features/timesheet/components/AuditHistoryDialog'
import StatusDialog from '@/shared/components/common/StatusDialog'
import ConfirmDialog from '@/shared/components/common/ConfirmDialog'

import { useProjectStore } from '@/features/projects/store/projectStore'

export default function TimesheetPage() {
    const { projects, fetchProjects, tasks } = useProjectStore()
    const {
        currentMonth,
        currentUser,
        setCurrentMonth,
        addEntry,
        updateEntry,
        deleteEntry,
        deleteEntries,
        entries,
        isDirty,
        isLoading,
        fetchCurrentUser,
        fetchEntries,
        saveEntries,
        submitTimesheet,
        currentTimesheetStatus,
        currentTimesheetComment,
        currentApprovalHistory,
    } = useTimesheetStore()
    const [searchParams] = useSearchParams()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [editingEntry, setEditingEntry] = useState<TimesheetEntry | undefined>(undefined)
    const [manager, setManager] = useState<{ id: string; firstName: string; lastName: string; role: string } | undefined>()
    const [potentialApprovers, setPotentialApprovers] = useState<{ id: string; firstName: string; lastName: string; role: string; email: string }[]>([])
    const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())
    const [showAuditHistory, setShowAuditHistory] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set())

    // Dialog state
    const [statusDialog, setStatusDialog] = useState<{ open: boolean; variant: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }>({
        open: false, variant: 'info', title: ''
    })
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description?: string; onConfirm: () => void; destructive?: boolean }>({
        open: false, title: '', onConfirm: () => { }
    })

    // Auto-open audit history when navigating from list with showHistory query param
    useEffect(() => {
        if (searchParams.get('showHistory') === 'true') {
            setShowAuditHistory(true)
        }
    }, [searchParams])

    // Determine if editing is allowed (Draft or Rejected)
    const isReadOnly = currentTimesheetStatus !== 'Draft' && currentTimesheetStatus !== 'Rejected'

    // Handle URL query params for month/year (from TimesheetListPage navigation)
    useEffect(() => {
        const monthParam = searchParams.get('month')
        const yearParam = searchParams.get('year')
        if (monthParam && yearParam) {
            const m = parseInt(monthParam)
            const y = parseInt(yearParam)
            if (!isNaN(m) && !isNaN(y)) {
                const targetDate = new Date(y, m - 1, 1)
                setCurrentMonth(targetDate)
            }
        }
    }, [searchParams, setCurrentMonth])

    // Fetch authenticated user on mount
    useEffect(() => {
        fetchCurrentUser()
    }, [fetchCurrentUser])

    // Fetch manager info when user is available
    useEffect(() => {
        if (currentUser) {
            getUserWithManager(currentUser.id)
                .then(data => setManager(data.manager))
                .catch(() => setManager(undefined))
        }
    }, [currentUser])

    // Fetch potential approvers
    useEffect(() => {
        getPotentialApprovers()
            .then(approvers => setPotentialApprovers(approvers))
            .catch(() => setPotentialApprovers([]))
    }, [])

    // Fetch projects when user is available
    useEffect(() => {
        if (currentUser) {
            fetchProjects(currentUser.id)
        }
    }, [currentUser, fetchProjects])

    // Fetch entries when user or month changes
    useEffect(() => {
        if (currentUser) {
            const month = currentMonth.getMonth() + 1
            const year = currentMonth.getFullYear()
            fetchEntries(month, year)
            setLastSyncTime(new Date())
        }
    }, [currentMonth, currentUser, fetchEntries])

    // Filter entries for current month
    const currentMonthEntries = useMemo(() => {
        const monthStr = format(currentMonth, 'yyyy-MM')
        return entries.filter(e => e.date.startsWith(monthStr))
    }, [entries, currentMonth])

    const monthlyTotal = useMemo(() => {
        return currentMonthEntries.reduce((sum, e) => sum + e.hours, 0)
    }, [currentMonthEntries])

    const handleAddEntry = (dateStr: string) => {
        if (isReadOnly) return
        setSelectedDate(new Date(dateStr))
        setEditingEntry(undefined)
        setIsDialogOpen(true)
    }

    const handleSaveEntry = (data: any) => {
        if (isReadOnly) return
        if (editingEntry) {
            updateEntry(editingEntry.id, data)
        } else {
            addEntry({
                ...data,
                date: format(selectedDate, 'yyyy-MM-dd'),
            })
        }
        setIsDialogOpen(false)
        setEditingEntry(undefined)
    }

    const handleSaveChanges = async () => {
        try {
            await saveEntries()
            setLastSyncTime(new Date())
        } catch {
            setStatusDialog({ open: true, variant: 'error', title: 'Save Failed', description: 'Failed to save changes. Please try again.' })
        }
    }

    const executeSubmit = useCallback(async (approverId?: string) => {
        try {
            const year = currentMonth.getFullYear()
            const month = currentMonth.getMonth() + 1
            await submitTimesheet(year, month, approverId)
            setStatusDialog({ open: true, variant: 'success', title: 'Submitted', description: 'Timesheet submitted successfully!' })
        } catch (error: any) {
            setStatusDialog({ open: true, variant: 'error', title: 'Submission Failed', description: error?.message || 'Failed to submit timesheet.' })
        }
    }, [currentMonth, submitTimesheet])

    const handleSubmit = (approverId?: string) => {
        if (isDirty) {
            setStatusDialog({ open: true, variant: 'warning', title: 'Unsaved Changes', description: 'Please save your changes before submitting.' })
            return
        }
        setConfirmDialog({
            open: true,
            title: 'Submit Timesheet',
            description: `Submit timesheet for ${format(currentMonth, 'MMMM yyyy')}? You won't be able to edit after submission.`,
            onConfirm: () => executeSubmit(approverId),
            destructive: false,
        })
    }

    const handleEditEntry = (entry: TimesheetEntry) => {
        if (isReadOnly) return
        setEditingEntry(entry)
        setSelectedDate(new Date(entry.date))
        setIsDialogOpen(true)
    }

    const handleDeleteEntry = (entryId: string) => {
        if (isReadOnly) return
        setConfirmDialog({
            open: true,
            title: 'Delete Entry',
            description: 'Are you sure you want to delete this entry?',
            onConfirm: () => deleteEntry(entryId),
        })
    }

    const handleDuplicateDay = (dateStr: string) => {
        if (isReadOnly) return
        const dayEntries = entries.filter(e => e.date === dateStr)

        if (dayEntries.length === 0) {
            setStatusDialog({ open: true, variant: 'info', title: 'Nothing to Duplicate', description: 'No entries to duplicate for this day.' })
            return
        }

        // If some entries are selected for this day, duplicate only those; otherwise duplicate the last entry
        const selectedForDay = dayEntries.filter(e => selectedEntryIds.has(e.id))
        const entriesToDuplicate = selectedForDay.length > 0 ? selectedForDay : [dayEntries[dayEntries.length - 1]]

        entriesToDuplicate.forEach(entry => {
            addEntry({
                date: entry.date,
                projectId: entry.projectId,
                taskId: entry.taskId,
                hours: entry.hours,
                description: entry.description,
            })
        })
    }

    const handleSelectEntry = (entryId: string, checked: boolean) => {
        setSelectedEntryIds(prev => {
            const next = new Set(prev)
            if (checked) {
                next.add(entryId)
            } else {
                next.delete(entryId)
            }
            return next
        })
    }

    const handleSelectAllForDay = (dateStr: string, checked: boolean) => {
        const dayEntries = entries.filter(e => e.date === dateStr)
        setSelectedEntryIds(prev => {
            const next = new Set(prev)
            dayEntries.forEach(e => {
                if (checked) {
                    next.add(e.id)
                } else {
                    next.delete(e.id)
                }
            })
            return next
        })
    }

    const handleDeleteSelectedForDay = (dateStr: string) => {
        if (isReadOnly) return
        const dayEntries = entries.filter(e => e.date === dateStr)
        const selectedForDay = dayEntries.filter(e => selectedEntryIds.has(e.id))
        if (selectedForDay.length === 0) return
        setConfirmDialog({
            open: true,
            title: 'Delete Selected Entries',
            description: `Are you sure you want to delete ${selectedForDay.length} selected entries?`,
            onConfirm: () => {
                deleteEntries(selectedForDay.map(e => e.id))
                setSelectedEntryIds(prev => {
                    const next = new Set(prev)
                    selectedForDay.forEach(e => next.delete(e.id))
                    return next
                })
            },
            destructive: true,
        })
    }

    const handleExport = useCallback(async () => {
        const { currentTimesheetId } = useTimesheetStore.getState()
        if (!currentTimesheetId) {
            setStatusDialog({ open: true, variant: 'warning', title: 'No Timesheet', description: 'Please save your entries first before exporting.' })
            return
        }
        setIsExporting(true)
        try {
            await exportToExcel(currentTimesheetId)
            setStatusDialog({ open: true, variant: 'success', title: 'Exported', description: 'Timesheet exported successfully!' })
        } catch (error: any) {
            setStatusDialog({ open: true, variant: 'error', title: 'Export Failed', description: error?.message || 'Failed to export timesheet.' })
        } finally {
            setIsExporting(false)
        }
    }, [])

    return (
        <div className="space-y-6">
            {/* Header */}
            <CalendarHeader
                currentMonth={currentMonth}
                onPrevMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
                onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
                monthlyTotal={monthlyTotal}
                status={currentTimesheetStatus}
                onSubmit={handleSubmit}
                isReadOnly={isReadOnly}
            />

            {/* Audit History Button — placed after the header */}
            {currentTimesheetStatus !== 'Draft' && (
                <div className="flex justify-end -mt-2">
                    <button
                        onClick={() => setShowAuditHistory(true)}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <History className="h-4 w-4" />
                        View History
                    </button>
                </div>
            )}

            {/* Rejection Alert */}
            {currentTimesheetStatus === 'Rejected' && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-destructive">Timesheet Rejected</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {currentTimesheetComment || 'Your timesheet has been rejected. Please review and resubmit.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <TimesheetStats
                entries={currentMonthEntries}
                currentMonth={currentMonth}
                status={currentTimesheetStatus}
            />

            {/* Daily Entry List */}
            <DailyEntryList
                currentMonth={currentMonth}
                entries={currentMonthEntries}
                projects={projects}
                tasks={Object.values(tasks).flat()}
                selectedEntryIds={selectedEntryIds}
                onAddEntry={handleAddEntry}
                onDuplicateDay={handleDuplicateDay}
                onEditEntry={handleEditEntry}
                onDeleteEntry={handleDeleteEntry}
                onSelectEntry={handleSelectEntry}
                onSelectAllForDay={handleSelectAllForDay}
                onDeleteSelectedForDay={handleDeleteSelectedForDay}
                readOnly={isReadOnly}
            />

            {/* Footer: Effort Distribution + Approver + Bottom Bar */}
            <TimesheetFooter
                entries={currentMonthEntries}
                projects={projects}
                currentUser={currentUser}
                manager={manager}
                potentialApprovers={potentialApprovers}
                onSubmit={handleSubmit}
                onSaveChanges={handleSaveChanges}
                onExport={handleExport}
                isDirty={isDirty}
                isLoading={isLoading}
                isExporting={isExporting}
                isReadOnly={isReadOnly}
                status={currentTimesheetStatus}
                lastSyncTime={lastSyncTime}
            />

            {/* Daily Log Dialog */}
            {!isReadOnly && (
                <DailyLogDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    date={selectedDate}
                    entry={editingEntry}
                    onSubmit={handleSaveEntry}
                />
            )}

            {/* Audit History Dialog */}
            <AuditHistoryDialog
                open={showAuditHistory}
                onOpenChange={setShowAuditHistory}
                history={currentApprovalHistory}
                periodLabel={format(currentMonth, 'MMMM yyyy')}
                userName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : undefined}
            />

            {/* Status Dialog */}
            <StatusDialog
                open={statusDialog.open}
                onOpenChange={(open) => setStatusDialog(prev => ({ ...prev, open }))}
                variant={statusDialog.variant}
                title={statusDialog.title}
                description={statusDialog.description}
            />

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
                title={confirmDialog.title}
                description={confirmDialog.description}
                onConfirm={confirmDialog.onConfirm}
                destructive={confirmDialog.destructive}
            />
        </div>
    )
}
