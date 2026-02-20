import { useState, useEffect, useMemo } from 'react'
import { Save, FileDown, ChevronDown } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { EffortDistribution } from './EffortDistribution'
import type { TimesheetEntry, Project, User, UserRole } from '@/shared/types'

interface TimesheetFooterProps {
    entries: TimesheetEntry[]
    projects: Project[]
    currentUser: User | null
    manager?: { id: string; firstName: string; lastName: string; role: string }
    potentialApprovers: { id: string; firstName: string; lastName: string; role: string; email: string }[]
    onSubmit: (approverId?: string) => void
    onSaveChanges: () => void
    onExport: () => void
    isDirty: boolean
    isLoading: boolean
    isExporting: boolean
    isReadOnly: boolean
    status: string
    lastSyncTime?: Date
}

export function TimesheetFooter({
    entries,
    projects,
    currentUser,
    manager,
    potentialApprovers,
    onSubmit,
    onSaveChanges,
    onExport,
    isDirty,
    isLoading,
    isExporting,
    isReadOnly,
    status,
    lastSyncTime,
}: TimesheetFooterProps) {
    const [selectedApproverId, setSelectedApproverId] = useState<string>('')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    // Filter approvers based on current user role
    const filteredApprovers = useMemo(() => {
        const userRole = (currentUser?.role as UserRole) || 'Employee'
        if (userRole === 'TeamLead') {
            return potentialApprovers.filter(a => a.role === 'Admin')
        }
        return potentialApprovers.filter(a => a.id !== currentUser?.id)
    }, [potentialApprovers, currentUser])

    // Default pre-select manager if available
    useEffect(() => {
        if (manager && !selectedApproverId) {
            const managerInList = filteredApprovers.find(a => a.id === manager.id)
            if (managerInList) {
                setSelectedApproverId(manager.id)
            } else if (filteredApprovers.length > 0) {
                setSelectedApproverId(filteredApprovers[0].id)
            }
        }
    }, [manager, selectedApproverId, filteredApprovers])

    const selectedApprover = filteredApprovers.find(a => a.id === selectedApproverId)

    const syncText = lastSyncTime
        ? `Last sync: ${Math.round((Date.now() - lastSyncTime.getTime()) / 60000)} mins ago`
        : 'Not synced'

    const canSubmit = status === 'Draft' || status === 'Rejected'
    const submitLabel = status === 'Rejected' ? 'Resubmit Timesheet' : 'Submit Timesheet'

    return (
        <div className="space-y-4">
            {/* Main Footer: Effort Distribution + Approver */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Left: Effort Distribution (3/5 width) */}
                <div className="lg:col-span-3">
                    <EffortDistribution entries={entries} projects={projects} />
                </div>

                {/* Right: Approver Card (2/5 width) — Redesigned */}
                <div className="lg:col-span-2">
                    <Card className="h-full p-5 flex flex-col justify-between border shadow-sm">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                                Submit To
                            </p>

                            {/* Approver Selection — Custom dropdown */}
                            {canSubmit && filteredApprovers.length > 0 ? (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="w-full flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                                    >
                                        {/* Avatar */}
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                            {selectedApprover
                                                ? `${selectedApprover.firstName[0]}${selectedApprover.lastName[0]}`
                                                : '??'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {selectedApprover
                                                    ? `${selectedApprover.firstName} ${selectedApprover.lastName}`
                                                    : 'Select approver...'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {selectedApprover?.role || 'Choose a reviewer'}
                                            </p>
                                        </div>
                                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown panel */}
                                    {isDropdownOpen && (
                                        <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg py-1">
                                            {filteredApprovers.map((approver) => (
                                                <button
                                                    key={approver.id}
                                                    onClick={() => {
                                                        setSelectedApproverId(approver.id)
                                                        setIsDropdownOpen(false)
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors ${approver.id === selectedApproverId ? 'bg-muted/30' : ''
                                                        }`}
                                                >
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                                        {approver.firstName[0]}{approver.lastName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{approver.firstName} {approver.lastName}</p>
                                                        <p className="text-xs text-muted-foreground">{approver.role}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                        {manager
                                            ? `${manager.firstName[0]}${manager.lastName[0]}`
                                            : 'TL'
                                        }
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {manager
                                                ? `${manager.firstName} ${manager.lastName}`
                                                : 'Team Lead'
                                            }
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {manager?.role || 'Manager'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!isReadOnly && canSubmit && (
                            <Button
                                onClick={() => onSubmit(selectedApproverId || undefined)}
                                className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                disabled={filteredApprovers.length > 0 && !selectedApproverId}
                            >
                                {submitLabel}
                            </Button>
                        )}
                    </Card>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="flex items-center justify-between py-3 border-t text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span className={`h-2 w-2 rounded-full ${isDirty ? 'bg-sap-critical' : 'bg-sap-positive'}`} />
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
                            className={isDirty ? 'text-sap-critical hover:opacity-80' : ''}
                        >
                            <Save className="h-4 w-4 mr-1.5" />
                            {isLoading ? 'Saving...' : 'Save as Draft'}
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="font-medium"
                        onClick={onExport}
                        disabled={isExporting}
                    >
                        <FileDown className="h-4 w-4 mr-1.5" />
                        {isExporting ? 'Exporting...' : 'Export Report'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
