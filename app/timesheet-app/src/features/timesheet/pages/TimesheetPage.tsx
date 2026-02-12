import { useState, useMemo, useEffect } from 'react'
import { addMonths, subMonths, setMonth, setYear, format } from 'date-fns'
import { CalendarHeader } from '@/features/timesheet/components/CalendarHeader'
import { TimesheetStats } from '@/features/timesheet/components/TimesheetStats'
import { DailyEntryList } from '@/features/timesheet/components/DailyEntryList'
import { EffortDistribution } from '@/features/timesheet/components/EffortDistribution'
import { DailyLogDialog } from '@/features/timesheet/components/DailyLogDialog'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import type { TimesheetEntry } from '@/shared/types'


export default function TimesheetPage() {
    const {
        currentMonth,
        currentUser,
        setCurrentMonth,
        addEntry,
        updateEntry,
        deleteEntry,
        entries,
        projects,
        isDirty,
        isLoading,
        fetchCurrentUser,
        fetchProjects,
        fetchEntries,
        saveEntries,
    } = useTimesheetStore()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [editingEntry, setEditingEntry] = useState<TimesheetEntry | undefined>(undefined)

    // Fetch authenticated user on mount
    useEffect(() => {
        fetchCurrentUser()
    }, [fetchCurrentUser])

    // Fetch projects when user is available
    useEffect(() => {
        if (currentUser) {
            fetchProjects()
        }
    }, [currentUser, fetchProjects])

    // Fetch entries when user or month changes
    useEffect(() => {
        if (currentUser) {
            const month = currentMonth.getMonth() + 1
            const year = currentMonth.getFullYear()
            fetchEntries(month, year)
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
        setSelectedDate(new Date(dateStr))
        setEditingEntry(undefined)
        setIsDialogOpen(true)
    }

    const handleSaveEntry = (data: any) => {
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
            alert('Changes saved successfully!')
        } catch (error) {
            alert('Failed to save changes')
        }
    }

    const handleSubmit = () => {
        // TODO: Implement timesheet submission
        console.log('Submitting timesheet for', format(currentMonth, 'MMMM yyyy'))
        alert('Timesheet submitted successfully!')
    }

    const handleEditEntry = (entry: TimesheetEntry) => {
        setEditingEntry(entry)
        setSelectedDate(new Date(entry.date))
        setIsDialogOpen(true)
    }

    const handleDeleteEntry = (entryId: string) => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            deleteEntry(entryId)
        }
    }

    const handleDuplicateDay = (dateStr: string) => {
        // Find all entries for the specified date
        const entriesToDuplicate = entries.filter(e => e.date === dateStr)

        if (entriesToDuplicate.length === 0) {
            alert('No entries to duplicate for this day')
            return
        }

        // Duplicate each entry
        entriesToDuplicate.forEach(entry => {
            addEntry({
                date: entry.date,
                projectId: entry.projectId,
                hours: entry.hours,
                description: entry.description,
            })
        })

        alert(`Duplicated ${entriesToDuplicate.length} entries for ${dateStr}`)
    }



    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <CalendarHeader
                    currentMonth={currentMonth}
                    onPrevMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    onMonthSelect={(month) => setCurrentMonth(setMonth(currentMonth, month))}
                    onYearSelect={(year) => setCurrentMonth(setYear(currentMonth, year))}
                    monthlyTotal={monthlyTotal}
                    status="Draft"
                    onSubmit={handleSubmit}
                    onSaveChanges={handleSaveChanges}
                    isDirty={isDirty}
                    isLoading={isLoading}
                />
            </div>


            <TimesheetStats entries={currentMonthEntries} />

            <DailyEntryList
                currentMonth={currentMonth}
                entries={currentMonthEntries}
                projects={projects}
                onAddEntry={handleAddEntry}
                onDuplicateDay={handleDuplicateDay}
                onEditEntry={handleEditEntry}
                onDeleteEntry={handleDeleteEntry}
            />

            <EffortDistribution
                entries={currentMonthEntries}
                projects={projects}
            />

            <DailyLogDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                date={selectedDate}
                entry={editingEntry}
                onSubmit={handleSaveEntry}
            />
        </div>
    )
}

