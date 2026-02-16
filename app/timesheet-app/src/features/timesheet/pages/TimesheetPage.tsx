import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { addMonths, subMonths, format } from 'date-fns'
import { CalendarHeader } from '@/features/timesheet/components/CalendarHeader'
import { TimesheetStats } from '@/features/timesheet/components/TimesheetStats'
import { DailyEntryList } from '@/features/timesheet/components/DailyEntryList'
import { DailyLogDialog } from '@/features/timesheet/components/DailyLogDialog'
import { TimesheetFooter } from '@/features/timesheet/components/TimesheetFooter'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import { userInfoAPI } from '@/shared/lib/api'
import type { TimesheetEntry } from '@/shared/types'

import { useProjectStore } from '@/features/projects/store/projectStore'

export default function TimesheetPage() {
    const { projects, fetchProjects } = useProjectStore()
    const {
        currentMonth,
        currentUser,
        setCurrentMonth,
        addEntry,
        updateEntry,
        deleteEntry,
        entries,
        isDirty,
        isLoading,
        fetchCurrentUser,
        fetchEntries,
        saveEntries,
        submitTimesheet,
        currentTimesheetStatus,
    } = useTimesheetStore()
    const [searchParams] = useSearchParams()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [editingEntry, setEditingEntry] = useState<TimesheetEntry | undefined>(undefined)
    const [manager, setManager] = useState<{ id: string; firstName: string; lastName: string; role: string } | undefined>()
    const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())

    // Determine if editing is allowed
    const isReadOnly = currentTimesheetStatus !== 'Draft'

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
            userInfoAPI.getWithManager(currentUser.id)
                .then(data => setManager(data.manager))
                .catch(() => setManager(undefined))
        }
    }, [currentUser])

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
            alert('Failed to save changes')
        }
    }

    const handleSubmit = async () => {
        if (isDirty) {
            alert('Please save your changes before submitting.')
            return
        }
        if (!window.confirm(`Submit timesheet for ${format(currentMonth, 'MMMM yyyy')}? You won't be able to edit after submission.`)) {
            return
        }
        try {
            const year = currentMonth.getFullYear()
            const month = currentMonth.getMonth() + 1
            await submitTimesheet(year, month)
            alert('Timesheet submitted successfully!')
        } catch (error: any) {
            alert(error?.message || 'Failed to submit timesheet')
        }
    }

    const handleEditEntry = (entry: TimesheetEntry) => {
        if (isReadOnly) return
        setEditingEntry(entry)
        setSelectedDate(new Date(entry.date))
        setIsDialogOpen(true)
    }

    const handleDeleteEntry = (entryId: string) => {
        if (isReadOnly) return
        if (window.confirm('Are you sure you want to delete this entry?')) {
            deleteEntry(entryId)
        }
    }

    const handleDuplicateDay = (dateStr: string) => {
        if (isReadOnly) return
        const entriesToDuplicate = entries.filter(e => e.date === dateStr)

        if (entriesToDuplicate.length === 0) {
            alert('No entries to duplicate for this day')
            return
        }

        entriesToDuplicate.forEach(entry => {
            addEntry({
                date: entry.date,
                projectId: entry.projectId,
                hours: entry.hours,
                description: entry.description,
            })
        })
    }

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
                onAddEntry={handleAddEntry}
                onDuplicateDay={handleDuplicateDay}
                onEditEntry={handleEditEntry}
                onDeleteEntry={handleDeleteEntry}
                readOnly={isReadOnly}
            />

            {/* Footer: Effort Distribution + Approver + Bottom Bar */}
            <TimesheetFooter
                entries={currentMonthEntries}
                projects={projects}
                currentUser={currentUser}
                manager={manager}
                onSubmit={handleSubmit}
                onSaveChanges={handleSaveChanges}
                isDirty={isDirty}
                isLoading={isLoading}
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
        </div>
    )
}
