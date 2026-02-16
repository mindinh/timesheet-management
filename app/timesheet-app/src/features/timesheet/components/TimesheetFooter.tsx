import { Save, FileDown } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { EffortDistribution } from './EffortDistribution'
import type { TimesheetEntry, Project, User } from '@/shared/types'

interface TimesheetFooterProps {
    entries: TimesheetEntry[]
    projects: Project[]
    currentUser: User | null
    manager?: { id: string; firstName: string; lastName: string; role: string }
    onSubmit: () => void
    onSaveChanges: () => void
    isDirty: boolean
    isLoading: boolean
    isReadOnly: boolean
    status: string
    lastSyncTime?: Date
}

export function TimesheetFooter({
    entries,
    projects,
    manager,
    onSubmit,
    onSaveChanges,
    isDirty,
    isLoading,
    isReadOnly,
    status,
    lastSyncTime,
}: TimesheetFooterProps) {

    const syncText = lastSyncTime
        ? `Last sync: ${Math.round((Date.now() - lastSyncTime.getTime()) / 60000)} mins ago`
        : 'Not synced'

    return (
        <div className="space-y-4">
            {/* Main Footer: Effort Distribution + Approver */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Left: Effort Distribution (3/5 width) */}
                <div className="lg:col-span-3">
                    <EffortDistribution entries={entries} projects={projects} />
                </div>

                {/* Right: Approver Card (2/5 width) */}
                <div className="lg:col-span-2">
                    <div className="p-5 bg-blue-600 rounded-lg text-white h-full flex flex-col justify-between">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200 mb-3">
                                Approver
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
                                    {manager
                                        ? `${manager.firstName[0]}${manager.lastName[0]}`
                                        : 'TL'
                                    }
                                </div>
                                <div>
                                    <p className="font-semibold">
                                        {manager
                                            ? `${manager.firstName} ${manager.lastName}`
                                            : 'Team Lead'
                                        }
                                    </p>
                                    <p className="text-blue-200 text-sm">
                                        {manager?.role || 'Manager'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {!isReadOnly && status === 'Draft' && (
                            <Button
                                onClick={onSubmit}
                                variant="secondary"
                                className="w-full mt-4 bg-white text-blue-600 hover:bg-blue-50 font-semibold"
                            >
                                Submit Timesheet
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="flex items-center justify-between py-3 border-t text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span className={`h-2 w-2 rounded-full ${isDirty ? 'bg-orange-500' : 'bg-green-500'}`} />
                    <span>{isDirty ? 'Unsaved changes' : 'All saved'}</span>
                    <span className="text-muted-foreground/50 ml-2">{syncText}</span>
                </div>

                <div className="flex items-center gap-3">
                    {!isReadOnly && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onSaveChanges}
                            disabled={!isDirty || isLoading}
                            className={isDirty ? 'text-orange-600 hover:text-orange-700' : ''}
                        >
                            <Save className="h-4 w-4 mr-1.5" />
                            {isLoading ? 'Saving...' : 'Save as Draft'}
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="font-medium"
                    >
                        <FileDown className="h-4 w-4 mr-1.5" />
                        Export Report
                    </Button>
                </div>
            </div>
        </div>
    )
}
