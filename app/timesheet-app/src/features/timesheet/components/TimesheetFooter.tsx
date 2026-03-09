import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { EffortDistribution } from './EffortDistribution';
import type { TimesheetEntry, Project } from '@/shared/types';

interface TimesheetFooterProps {
  entries: TimesheetEntry[];
  projects: Project[];
  manager?: { id: string; firstName: string; lastName: string; role: string };
  teamLeads?: { id: string; firstName: string; lastName: string; email: string }[];
  onSubmit: (teamLeadId?: string) => void;
  isReadOnly: boolean;
  status: string;
  isAdmin?: boolean;
}

export function TimesheetFooter({
  entries,
  projects,
  manager,
  teamLeads = [],
  onSubmit,
  isReadOnly,
  status,
  isAdmin = false,
}: TimesheetFooterProps) {
  const [selectedTeamLeadId, setSelectedTeamLeadId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const canSubmit = status === 'Draft' || status === 'Reopened';
  const submitLabel = isAdmin
    ? status === 'Reopened'
      ? 'Resubmit & Finish'
      : 'Submit & Finish'
    : status === 'Reopened'
      ? 'Resubmit Timesheet'
      : 'Submit Timesheet';

  // Admin doesn't need to pick a Team Lead — backend auto-finishes
  const needsTeamLeadSelection = !isAdmin && !manager && canSubmit;
  const selectedTeamLead = teamLeads.find((tl) => tl.id === selectedTeamLeadId);

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

              {/* Admin: show auto-finish notice */}
              {isAdmin ? (
                <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    ✓
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Direct Submission</p>
                    <p className="text-xs text-muted-foreground">Timesheet will be auto-finished on submit</p>
                  </div>
                </div>
              ) : manager ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {manager.firstName[0]}
                    {manager.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {manager.firstName} {manager.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{manager.role || 'Team Lead'} (Assigned)</p>
                  </div>
                </div>
              ) : (
                /* Case 2: No manager – show TL selector */
                <>
                  {canSubmit && (
                    <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300">
                      <strong>No Team Lead assigned.</strong> Please select one below to submit your timesheet.
                    </div>
                  )}

                  {canSubmit && teamLeads.length > 0 ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {selectedTeamLead ? `${selectedTeamLead.firstName[0]}${selectedTeamLead.lastName[0]}` : '??'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {selectedTeamLead
                              ? `${selectedTeamLead.firstName} ${selectedTeamLead.lastName}`
                              : 'Select Team Lead…'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedTeamLead ? selectedTeamLead.email : 'Choose a reviewer'}
                          </p>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute z-10 bottom-[110%] mb-1 w-full rounded-lg border border-border bg-card shadow-lg py-1 max-h-48 overflow-y-auto">
                          {teamLeads.map((tl) => (
                            <button
                              key={tl.id}
                              onClick={() => {
                                setSelectedTeamLeadId(tl.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors ${tl.id === selectedTeamLeadId ? 'bg-muted/30' : ''}`}
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                {tl.firstName[0]}
                                {tl.lastName[0]}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {tl.firstName} {tl.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">{tl.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : canSubmit && teamLeads.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                      <p className="text-sm text-muted-foreground">No Team Leads available</p>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {!isReadOnly && canSubmit && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <Button
                  onClick={() => onSubmit(needsTeamLeadSelection ? selectedTeamLeadId || undefined : undefined)}
                  className="w-full font-semibold"
                  disabled={needsTeamLeadSelection && !selectedTeamLeadId}
                >
                  {submitLabel}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
