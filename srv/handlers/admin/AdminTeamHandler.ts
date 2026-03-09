import cds from '@sap/cds';
import { resolveUser } from '../../lib/user-resolver';

/**
 * AdminTeamHandler
 *
 * Admin-side team management:
 *   - getAllTeams: returns all TeamLeads + their direct-report employees
 *   - adminAssignTeamLead: assigns a TeamLead under the current Admin (manager_ID = admin)
 *   - adminUnassignTeamLead: clears a TeamLead's manager_ID
 *   - getUnassignedTeamLeads: returns TeamLeads with no admin yet
 */
export class AdminTeamHandler {
  private srv: any;

  constructor(srv: any) {
    this.srv = srv;
  }

  register() {
    this.srv.on('getAllTeams', this.onGetAllTeams.bind(this));
    this.srv.on('adminAssignTeamLead', this.onAdminAssignTeamLead.bind(this));
    this.srv.on('adminUnassignTeamLead', this.onAdminUnassignTeamLead.bind(this));
    this.srv.on('getUnassignedTeamLeads', this.onGetUnassignedTeamLeads.bind(this));
  }

  // ── Get all teams (all TeamLeads + their members) ──────────────────────────

  private async onGetAllTeams(req: any) {
    const user = await resolveUser(req);
    if (!user) return req.reject(401, 'User not found');

    const db = cds.db || (await cds.connect.to('db'));
    const { User } = db.entities('sap.timesheet');

    // Only TeamLeads assigned to THIS admin (manager_ID = admin's ID)
    const teamLeads = await SELECT.from(User).where`role = 'TeamLead' and manager_ID = ${user.ID}`;

    // For each TeamLead, gather their direct-report employees
    const teams = await Promise.all(
      teamLeads.map(async (tl: any) => {
        const members = await SELECT.from(User).where`manager_ID = ${tl.ID} and role = 'Employee'`;
        return {
          teamLeadId: tl.ID,
          firstName: tl.firstName,
          lastName: tl.lastName,
          email: tl.email,
          adminId: tl.manager_ID ?? null,
          members: members.map((m: any) => ({
            id: m.ID,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
            role: m.role,
          })),
        };
      })
    );

    return JSON.stringify(teams);
  }

  // ── Admin assigns a TeamLead to themselves ─────────────────────────────────

  private async onAdminAssignTeamLead(req: any) {
    const { teamLeadId } = req.data;
    const user = await resolveUser(req);
    if (!user) return req.reject(401, 'User not found');

    const db = cds.db || (await cds.connect.to('db'));
    const { User } = db.entities('sap.timesheet');

    const [teamLead] = await SELECT.from(User).where({ ID: teamLeadId });
    if (!teamLead) return req.reject(404, 'TeamLead not found');
    if (teamLead.role !== 'TeamLead') return req.reject(400, 'User is not a TeamLead');

    if (teamLead.manager_ID && teamLead.manager_ID !== user.ID) {
      return req.reject(409, 'TeamLead is already assigned to another Admin');
    }

    await UPDATE(User).set({ manager_ID: user.ID }).where({ ID: teamLeadId });
    return 'TeamLead assigned successfully';
  }

  // ── Admin unassigns a TeamLead ─────────────────────────────────────────────

  private async onAdminUnassignTeamLead(req: any) {
    const { teamLeadId } = req.data;
    const user = await resolveUser(req);
    if (!user) return req.reject(401, 'User not found');

    const db = cds.db || (await cds.connect.to('db'));
    const { User } = db.entities('sap.timesheet');

    const [teamLead] = await SELECT.from(User).where({ ID: teamLeadId });
    if (!teamLead) return req.reject(404, 'TeamLead not found');

    await UPDATE(User).set({ manager_ID: null }).where({ ID: teamLeadId });
    return 'TeamLead unassigned successfully';
  }

  // ── Get TeamLeads with no admin assigned ───────────────────────────────────

  private async onGetUnassignedTeamLeads(req: any) {
    const user = await resolveUser(req);
    if (!user) return req.reject(401, 'User not found');

    const db = cds.db || (await cds.connect.to('db'));
    const { User } = db.entities('sap.timesheet');

    const leads = await SELECT.from(User).where`role = 'TeamLead' and manager_ID is null`;
    const result = await Promise.all(
      leads.map(async (tl: any) => {
        const members = await SELECT.from(User).where`manager_ID = ${tl.ID} and role = 'Employee'`;
        return {
          id: tl.ID,
          firstName: tl.firstName,
          lastName: tl.lastName,
          email: tl.email,
          members: members.map((m: any) => ({ id: m.ID, firstName: m.firstName, lastName: m.lastName, email: m.email })),
        };
      })
    );
    return JSON.stringify(result);
  }
}
