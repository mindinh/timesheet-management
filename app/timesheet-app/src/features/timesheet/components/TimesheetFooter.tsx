import { useState, useEffect, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
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
    isReadOnly: boolean
    status: string
}

export function TimesheetFooter({
    entries,
    projects,
    currentUser,
    manager,
    potentialApprovers,
    onSubmit,
    isReadOnly,
    status,
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

    const canSubmit = status === 'Draft' || status === 'Reopened'
    const submitLabel = status === 'Reopened' ? 'Resubmit Timesheet' : 'Submit Timesheet'

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
                    <Card className="h-full p-5 flex flex-col justify-between border shadow-sm">
                        <div className="flex flex-col flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                                Submit To
                            </p>

                            {/* Auto assigned manager or fallback dropdown */}
                            {manager ? (
                                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                        {manager.firstName[0]}{manager.lastName[0]}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">
                                            {manager.firstName} {manager.lastName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {manager.role || 'Team Lead'} (Assigned)
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {canSubmit && (
                                        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                            <strong>Warning:</strong> You are not currently assigned to any Team Lead. Please select an approver manually.
                                        </div>
                                    )}
                                    {canSubmit && filteredApprovers.length > 0 ? (
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                className="w-full flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                                            >
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

                                            {isDropdownOpen && (
                                                <div className="absolute z-10 bottom-[110%] mb-1 w-full rounded-lg border border-border bg-card shadow-lg py-1 max-h-48 overflow-y-auto">
                                                    {filteredApprovers.map((approver) => (
                                                        <button
                                                            key={approver.id}
                                                            onClick={() => {
                                                                setSelectedApproverId(approver.id)
                                                                setIsDropdownOpen(false)
                                                            }}
                                                            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors ${approver.id === selectedApproverId ? 'bg-muted/30' : ''}`}
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
                                    ) : !canSubmit ? (
                                        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                                {selectedApprover
                                                    ? `${selectedApprover.firstName[0]}${selectedApprover.lastName[0]}`
                                                    : '??'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">
                                                    {selectedApprover
                                                        ? `${selectedApprover.firstName} ${selectedApprover.lastName}`
                                                        : 'Not selected'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </div>

                        {!isReadOnly && canSubmit && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                                <Button
                                    onClick={() => {
                                        // If manager exists, we pass undefined or manager.id
                                        // The backend handler will use the manager automatically if we pass undefined
                                        onSubmit(manager ? manager.id : (selectedApproverId || undefined))
                                    }}
                                    className="w-full font-semibold"
                                    disabled={!manager && filteredApprovers.length > 0 && !selectedApproverId}
                                >
                                    {submitLabel}
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    )
}

