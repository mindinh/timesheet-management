import cds from '@sap/cds';
import { resolveUser } from '../../lib/user-resolver';

/**
 * TimesheetAuthHandler
 * Handles user identity resolution and entity-level access filtering.
 */
export class TimesheetAuthHandler {
  private srv: any;

  constructor(srv: any) {
    this.srv = srv;
  }

  register() {
    const { Projects, Timesheets } = this.srv.entities;

    // ── userInfo: return the effective user profile ──
    this.srv.on('userInfo', async (req: any) => {
      const user = await resolveUser(req);
      if (!user) {
        return req.reject(404, `User not found`);
      }
      return {
        id: user.ID,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      };
    });

    // Auto-set createdBy_ID on project creation
    this.srv.before('CREATE', Projects, async (req: any) => {
      const user = await resolveUser(req);
      if (user) {
        req.data.projectCreator_ID = user.ID;
      }
    });

    // Filter timesheets: show user's own OR timesheets where user is currentApprover
    this.srv.before('READ', Timesheets, async (req: any) => {
      const user = await resolveUser(req);
      if (user) {
        if (!req.query.SELECT.where) {
          req.query.SELECT.where = [];
        } else {
          req.query.SELECT.where.push('and');
        }
        // Show own timesheets OR timesheets where this user is the current approver
        req.query.SELECT.where.push(
          '(',
          { ref: ['user_ID'] },
          '=',
          { val: user.ID },
          'or',
          { ref: ['currentApprover_ID'] },
          '=',
          { val: user.ID },
          ')'
        );
      }
    });
  }
}
