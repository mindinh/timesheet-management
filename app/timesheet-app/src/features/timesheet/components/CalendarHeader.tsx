import { ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'
import { Badge } from '@/shared/components/ui/badge'
import { format } from 'date-fns'
import { useTimesheetStore } from '../store/timesheetStore'


interface CalendarHeaderProps {
    currentMonth: Date
    onPrevMonth: () => void
    onNextMonth: () => void
    onMonthSelect: (month: number) => void
    onYearSelect: (year: number) => void
    monthlyTotal?: number
    status?: 'Draft' | 'Submitted' | 'Approved' | 'Rejected'
    onSubmit?: () => void
    onSaveChanges?: () => void
    isDirty?: boolean
    isLoading?: boolean
}

export function CalendarHeader({
    currentMonth,
    onPrevMonth,
    onNextMonth,
    onMonthSelect,
    onYearSelect,
    monthlyTotal = 0,
    status = 'Draft',
    onSubmit,
    onSaveChanges,
    isDirty = false,
    isLoading = false,
}: CalendarHeaderProps) {
    const { currentUser } = useTimesheetStore()
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)
    const months = Array.from({ length: 12 }, (_, i) => i)

    const statusColors = {
        Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        Approved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        Rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    }

    return (
        <div className="flex-col items-center justify-between flex-wrap w-full">
            <h1 className="text-xl font-bold mb-4"> {currentUser?.firstName + ' ' + currentUser?.lastName} - Timesheet</h1>
            <div className="flex items-center w-full justify-between">
                <div className="flex items-center gap-2">

                    <Button variant="outline" size="icon" onClick={onPrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold w-35 text-center">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <Button variant="outline" size="icon" onClick={onNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-2">
                        <Select
                            value={currentMonth.getMonth().toString()}
                            onValueChange={(val) => onMonthSelect(parseInt(val))}
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((month) => (
                                    <SelectItem key={month} value={month.toString()}>
                                        {format(new Date(2000, month, 1), 'MMMM')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={currentMonth.getFullYear().toString()}
                            onValueChange={(val) => onYearSelect(parseInt(val))}
                        >
                            <SelectTrigger className="w-[100px]">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((year) => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>




                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">
                            Month Total
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                            {monthlyTotal.toFixed(2)} <span className="text-xs">HRS</span>
                        </div>
                    </div>

                    <Badge className={statusColors[status]} variant="secondary">
                        Status: {status}
                    </Badge>

                    <Button
                        onClick={onSaveChanges}
                        size="lg"
                        variant="outline"
                        disabled={!isDirty || isLoading}
                        className={isDirty ? 'border-orange-500 text-orange-600' : ''}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? 'Saving...' : 'Save Changes'}
                        {isDirty && <span className="ml-2 text-xs">●</span>}
                    </Button>

                    <Button
                        onClick={onSubmit}
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={status !== 'Draft'}
                    >
                        Submit
                    </Button>
                </div>
            </div>
        </div>
    )
}
