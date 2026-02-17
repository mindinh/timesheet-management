import { useState, useEffect, useMemo } from 'react'
import { Save, FileDown } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'
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
    isDirty: boolean
    isLoading: boolean
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
    isDirty,
    isLoading,
    isReadOnly,
    status,
    lastSyncTime,
}: TimesheetFooterProps) {
    const [selectedApproverId, setSelectedApproverId] = useState<string>('')

    // Filter approvers based on current user role:
    // - TeamLead submits to Admin only
    // - Employee submits to TeamLead or Admin
    const filteredApprovers = useMemo(() => {
        const userRole = (currentUser?.role as UserRole) || 'Employee'
        if (userRole === 'TeamLead') {
            return potentialApprovers.filter(a => a.role === 'Admin')
        }
        // Employee can submit to TeamLead or Admin
        return potentialApprovers.filter(a => a.id !== currentUser?.id)
    }, [potentialApprovers, currentUser])

    // Default pre-select manager if available
    useEffect(() => {
        if (manager && !selectedApproverId) {
            // If manager is in filtered list, pre-select; otherwise pick first
            const managerInList = filteredApprovers.find(a => a.id === manager.id)
            if (managerInList) {
                setSelectedApproverId(manager.id)
            } else if (filteredApprovers.length > 0) {
                setSelectedApproverId(filteredApprovers[0].id)
            }
        }
    }, [manager, selectedApproverId, filteredApprovers])

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

                {/* Right: Approver Card (2/5 width) */}
                <div className="lg:col-span-2">
                    <div className="p-5 bg-primary rounded-lg text-primary-foreground h-full flex flex-col justify-between">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/60 mb-3">
                                Submit To
                            </p>

                            {/* Approver Selection */}
                            {canSubmit && filteredApprovers.length > 0 ? (
                                <Select value={selectedApproverId} onValueChange={setSelectedApproverId}>
                                    <SelectTrigger className="h-10 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
                                        <SelectValue placeholder="Select approver..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredApprovers.map((approver) => (
                                            <SelectItem key={approver.id} value={approver.id}>
                                                <div className="flex items-center gap-2">
                                                    <span>{approver.firstName} {approver.lastName}</span>
                                                    <span className="text-xs text-muted-foreground">({approver.role})</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold">
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
                                        <p className="text-primary-foreground/60 text-sm">
                                            {manager?.role || 'Manager'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!isReadOnly && canSubmit && (
                            <Button
                                onClick={() => onSubmit(selectedApproverId || undefined)}
                                variant="secondary"
                                className="w-full mt-4 bg-white text-primary hover:bg-primary-foreground/90 font-semibold"
                                disabled={filteredApprovers.length > 0 && !selectedApproverId}
                            >
                                {submitLabel}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="flex items-center justify-between py-3 border-t text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span className={`h-2 w-2 rounded-full ${isDirty ? 'bg-[var(--sap-critical)]' : 'bg-[var(--sap-positive)]'}`} />
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
                            className={isDirty ? 'text-[color:var(--sap-critical)] hover:opacity-80' : ''}
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
