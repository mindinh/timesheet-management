import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { toast } from 'sonner';
import { getMyMembers, getUnassignedEmployees, assignMember, removeMember } from '../api/teamlead-api';
import { getAllTeams, getUnassignedTeamLeads, adminAssignTeamLead, adminUnassignTeamLead, type TeamGroup, type TeamLeadUser } from '@/features/admin/api/admin-team-api';
import { Users, UserPlus, Search, X, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import type { User } from '@/shared/types';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import { useAuthStore } from '@/features/auth/store/authStore';

// ── Avatar helpers ──────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-indigo-500 to-blue-600',
];

function avatarColor(name: string) {
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

function MemberAvatar({ firstName = '', lastName = '', size = 'md' }: { firstName?: string; lastName?: string; size?: 'sm' | 'md' }) {
  const name = `${firstName}${lastName}`;
  const sz = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-10 w-10 text-sm';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center text-white font-semibold shrink-0 shadow-sm`}>
      {initials(firstName, lastName)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TEAMLEAD VIEW
// ═══════════════════════════════════════════════════════════

function TeamLeadView() {
  const queryClient = useQueryClient();
  const [memberSearch, setMemberSearch] = useState('');
  const [poolSearch, setPoolSearch] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; memberId: string; memberName: string }>(
    { open: false, memberId: '', memberName: '' }
  );

  const { data: members = [], isLoading: loadingMembers } = useQuery({ queryKey: ['my-members'], queryFn: getMyMembers });
  const { data: unassigned = [], isLoading: loadingUnassigned } = useQuery({ queryKey: ['unassigned-employees'], queryFn: getUnassignedEmployees });

  const assignMutation = useMutation({
    mutationFn: assignMember,
    onSuccess: () => { toast.success('Member added to your team'); queryClient.invalidateQueries({ queryKey: ['my-members'] }); queryClient.invalidateQueries({ queryKey: ['unassigned-employees'] }); },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || err?.message || 'Failed'),
    onSettled: () => setAssigningId(null),
  });

  const removeMutation = useMutation({
    mutationFn: removeMember,
    onSuccess: () => { toast.success('Member removed'); queryClient.invalidateQueries({ queryKey: ['my-members'] }); queryClient.invalidateQueries({ queryKey: ['unassigned-employees'] }); },
    onError: () => toast.error('Failed to remove member'),
    onSettled: () => setRemovingId(null),
  });

  const filteredMembers = useMemo(() => {
    const q = memberSearch.toLowerCase();
    return members.filter((u: User) => !q || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [members, memberSearch]);

  const filteredPool = useMemo(() => {
    const q = poolSearch.toLowerCase();
    return unassigned.filter((u: User) => !q || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [unassigned, poolSearch]);

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Users className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{members.length}</p><p className="text-xs text-muted-foreground font-medium">Team Members</p></div>
          </div>
          <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0"><UserPlus className="h-5 w-5 text-warning" /></div>
            <div><p className="text-2xl font-bold">{unassigned.length}</p><p className="text-xs text-muted-foreground font-medium">Unassigned Available</p></div>
          </div>
        </div>

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* My Team */}
          <div className="rounded-xl border bg-card flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2 shrink-0">
              <Users className="h-4 w-4 text-primary" /><h2 className="font-semibold text-sm">My Team</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{members.length}</span>
            </div>
            {members.length > 0 && (
              <div className="px-4 pt-3 pb-2 shrink-0">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search members…" className="h-8 pl-8 text-xs" />
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {loadingMembers ? <SkeletonList /> : filteredMembers.length === 0 ? (
                <EmptyState icon={<Users className="h-6 w-6 text-muted-foreground" />} title={memberSearch ? 'No members match' : 'No members yet'} desc={memberSearch ? 'Try a different search' : 'Assign employees from the pool'} />
              ) : (
                <ul className="p-4 space-y-2">
                  {filteredMembers.map((u: User) => (
                    <li key={u.id} className="group flex items-center gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <MemberAvatar firstName={u.firstName} lastName={u.lastName} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                        disabled={removingId === String(u.id)}
                        onClick={() => setConfirmDialog({ open: true, memberId: String(u.id), memberName: `${u.firstName} ${u.lastName}` })}
                      ><X className="h-3.5 w-3.5 mr-1" />{removingId === String(u.id) ? 'Removing…' : 'Remove'}</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Unassigned Pool */}
          <div className="rounded-xl border bg-card flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2 shrink-0">
              <UserPlus className="h-4 w-4 text-muted-foreground" /><h2 className="font-semibold text-sm">Unassigned Employees</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{unassigned.length}</span>
            </div>
            {unassigned.length > 0 && (
              <div className="px-4 pt-3 pb-2 shrink-0">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input value={poolSearch} onChange={(e) => setPoolSearch(e.target.value)} placeholder="Search employees…" className="h-8 pl-8 text-xs" />
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {loadingUnassigned ? <SkeletonList /> : filteredPool.length === 0 ? (
                <EmptyState icon={<UserPlus className="h-6 w-6 text-muted-foreground" />} title={poolSearch ? 'No employees match' : 'No unassigned employees'} desc={poolSearch ? 'Try a different search' : 'All employees are assigned'} />
              ) : (
                <ul className="p-4 space-y-2">
                  {filteredPool.map((u: User) => (
                    <li key={u.id} className="group flex items-center gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <MemberAvatar firstName={u.firstName} lastName={u.lastName} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/10 transition-all"
                        disabled={assigningId === String(u.id)}
                        onClick={() => { setAssigningId(String(u.id)); assignMutation.mutate(String(u.id)); }}
                      ><UserPlus className="h-3.5 w-3.5 mr-1" />{assigningId === String(u.id) ? 'Adding…' : 'Add to Team'}</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((p) => ({ ...p, open }))}
        title="Remove Team Member"
        description={`Remove ${confirmDialog.memberName} from your team? They will become unassigned.`}
        onConfirm={() => { setRemovingId(confirmDialog.memberId); removeMutation.mutate(confirmDialog.memberId); setConfirmDialog({ open: false, memberId: '', memberName: '' }); }}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// ADMIN VIEW
// ═══════════════════════════════════════════════════════════

function AdminView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [expandedPool, setExpandedPool] = useState<Set<string>>(new Set());
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; teamLeadId: string; name: string }>(
    { open: false, teamLeadId: '', name: '' }
  );

  const { data: teams = [], isLoading: loadingTeams } = useQuery({ queryKey: ['admin-all-teams'], queryFn: getAllTeams });
  const { data: unassignedLeads = [], isLoading: loadingPool } = useQuery({ queryKey: ['admin-unassigned-leads'], queryFn: getUnassignedTeamLeads });

  const assignMutation = useMutation({
    mutationFn: adminAssignTeamLead,
    onSuccess: () => {
      toast.success('Team Lead added to your scope');
      queryClient.invalidateQueries({ queryKey: ['admin-all-teams'] });
      queryClient.invalidateQueries({ queryKey: ['admin-unassigned-leads'] });
    },
    onError: () => toast.error('Failed to add Team Lead'),
    onSettled: () => setAssigningId(null),
  });

  const unassignMutation = useMutation({
    mutationFn: adminUnassignTeamLead,
    onSuccess: () => {
      toast.success('Team Lead unassigned successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-all-teams'] });
      queryClient.invalidateQueries({ queryKey: ['admin-unassigned-leads'] });
    },
    onError: (_err, teamLeadId) => {
      // Rollback ghost state on failure
      setRemovingIds((prev) => { const next = new Set(prev); next.delete(teamLeadId); return next; });
      toast.error('Failed to unassign Team Lead');
    },
    onSettled: (_data, _err, teamLeadId) => {
      setRemovingIds((prev) => { const next = new Set(prev); next.delete(teamLeadId); return next; });
      setUnassigningId(null);
    },
  });

  const filteredTeams = useMemo(() => {
    const q = search.toLowerCase();
    return teams.filter((t) => !q || `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q));
  }, [teams, search]);

  const toggleExpand = (id: string) => {
    setExpandedTeams((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const totalMembers = teams.reduce((sum, t) => sum + t.members.length, 0);

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Shield className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{teams.length}</p><p className="text-xs text-muted-foreground font-medium">Teams</p></div>
          </div>
          <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><Users className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-bold">{totalMembers}</p><p className="text-xs text-muted-foreground font-medium">Total Employees</p></div>
          </div>
          <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0"><UserPlus className="h-5 w-5 text-warning" /></div>
            <div><p className="text-2xl font-bold">{unassignedLeads.length}</p><p className="text-xs text-muted-foreground font-medium">Unassigned Team Leads</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* All Teams panel */}
          <div className="rounded-xl border bg-card flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2 shrink-0">
              <Users className="h-4 w-4 text-primary" /><h2 className="font-semibold text-sm">All Teams</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{teams.length}</span>
            </div>
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team leads…" className="h-8 pl-8 text-xs" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {loadingTeams ? <SkeletonList /> : filteredTeams.length === 0 ? (
                <EmptyState icon={<Users className="h-6 w-6 text-muted-foreground" />} title="No teams" desc="No team leads found" />
              ) : filteredTeams.map((team) => {
                const expanded = expandedTeams.has(team.teamLeadId);
                const isRemoving = removingIds.has(team.teamLeadId);
                return (
                  <div key={team.teamLeadId}
                    className={`rounded-lg border overflow-hidden transition-all duration-300 ${
                      isRemoving ? 'bg-destructive/5 border-destructive/20 opacity-60' : 'bg-background/50'
                    }`}
                  >
                    {/* TeamLead row */}
                    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors group">
                      <button onClick={() => toggleExpand(team.teamLeadId)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <MemberAvatar firstName={team.firstName} lastName={team.lastName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isRemoving ? 'line-through text-muted-foreground' : ''}`}>
                            {team.firstName} {team.lastName}
                          </p>
                          {isRemoving ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                              <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                              Unassigning…
                            </span>
                          ) : (
                            <p className="text-xs text-muted-foreground truncate">{team.members.length} member{team.members.length !== 1 ? 's' : ''}</p>
                          )}
                        </div>
                      </button>
                      <Button variant="ghost" size="sm"
                        className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                        disabled={isRemoving}
                        onClick={() => setConfirmDialog({ open: true, teamLeadId: team.teamLeadId, name: `${team.firstName} ${team.lastName}` })}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        {isRemoving ? 'Removing…' : 'Remove'}
                      </Button>
                    </div>
                    {/* Members sub-list */}
                    {expanded && team.members.length > 0 && (
                      <div className="border-t divide-y divide-border/50">
                        {team.members.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 pl-10 pr-3 py-2">
                            <MemberAvatar firstName={m.firstName} lastName={m.lastName} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{m.firstName} {m.lastName}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {expanded && team.members.length === 0 && (
                      <div className="pl-10 pr-3 py-2 text-xs text-muted-foreground border-t">No members in this team</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unassigned Team Leads pool */}
          <div className="rounded-xl border bg-card flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2 shrink-0">
              <Shield className="h-4 w-4 text-muted-foreground" /><h2 className="font-semibold text-sm">Unassigned Team Leads</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{unassignedLeads.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {loadingPool ? <SkeletonList /> : unassignedLeads.length === 0 ? (
                <EmptyState icon={<Shield className="h-6 w-6 text-muted-foreground" />} title="All Team Leads assigned" desc="Every team lead is already in a team" />
              ) : unassignedLeads.map((tl) => {
                const expanded = expandedPool.has(tl.id);
                const members = tl.members ?? [];
                return (
                  <div key={tl.id} className="rounded-lg border bg-background/50 overflow-hidden">
                    {/* TL row */}
                    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors group">
                      <button
                        onClick={() => setExpandedPool((prev) => { const next = new Set(prev); next.has(tl.id) ? next.delete(tl.id) : next.add(tl.id); return next; })}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <MemberAvatar firstName={tl.firstName} lastName={tl.lastName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{tl.firstName} {tl.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                        </div>
                      </button>
                      <Button variant="ghost" size="sm"
                        className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/10 transition-all"
                        disabled={assigningId === tl.id}
                        onClick={() => { setAssigningId(tl.id); assignMutation.mutate(tl.id); }}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />{assigningId === tl.id ? 'Adding…' : 'Add to Scope'}
                      </Button>
                    </div>
                    {/* Members sub-list */}
                    {expanded && members.length > 0 && (
                      <div className="border-t divide-y divide-border/50">
                        {members.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 pl-10 pr-3 py-2">
                            <MemberAvatar firstName={m.firstName} lastName={m.lastName} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{m.firstName} {m.lastName}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {expanded && members.length === 0 && (
                      <div className="pl-10 pr-3 py-2 text-xs text-muted-foreground border-t">No members in this team</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((p) => ({ ...p, open }))}
        title="Remove Team Lead"
        description={`Remove ${confirmDialog.name} from your admin scope? Their team members won't be affected.`}
        onConfirm={() => {
          const id = confirmDialog.teamLeadId;
          setUnassigningId(id);
          // Add to ghost state immediately
          setRemovingIds((prev) => new Set(prev).add(id));
          unassignMutation.mutate(id);
          setConfirmDialog({ open: false, teamLeadId: '', name: '' });
        }}
      />
    </>
  );
}

// ── Shared sub-components ───────────────────────────────────────────────────

function SkeletonList() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />)}
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════

export default function TeamMembersPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin';
  return isAdmin ? <AdminView /> : <TeamLeadView />;
}
