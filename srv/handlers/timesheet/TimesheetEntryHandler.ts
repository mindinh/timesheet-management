import cds from '@sap/cds';
import { resolveUser } from '../../lib/user-resolver';

/**
 * TimesheetEntryHandler
 * Handles entry-level operations: draft enforcement and hours modification.
 */
export class TimesheetEntryHandler {
  private srv: any;

  constructor(srv: any) {
    this.srv = srv;
  }

  register() {
    const { TimesheetEntries } = this.srv.entities;

    // ── Draft/Reopened enforcement for TimesheetEntries ──
    this.srv.before(['CREATE'], TimesheetEntries, this.assertTimesheetIsEditable);
    this.srv.before(['UPDATE'], TimesheetEntries, this.assertTimesheetIsEditable);
    this.srv.before(['DELETE'], TimesheetEntries, this.assertTimesheetIsEditable);

    // ── Max 24h validation ──
    this.srv.before(['CREATE', 'UPDATE'], TimesheetEntries, (req: any) => {
      const hours = req.data?.loggedHours;
      if (hours !== undefined && Number(hours) > 24) {
        return req.reject(400, `loggedHours cannot exceed 24 hours per entry. Received: ${hours}`);
      }
      if (hours !== undefined && Number(hours) <= 0) {
        return req.reject(400, `loggedHours must be greater than 0. Received: ${hours}`);
      }
    });

    // ── Auto-trigger task InProgress when an entry is linked to a task ──
    this.srv.after(['CREATE', 'UPDATE'], TimesheetEntries, async (result: any, req: any) => {
      try {
        const db = cds.db || (await cds.connect.to('db'));
        const { TimesheetEntry, Task } = db.entities('sap.timesheet');

        let taskId: string | undefined;

        if (req.event === 'CREATE') {
          // On CREATE, req.data is the full payload sent by the client
          taskId = result?.task_ID ?? req.data?.task_ID;
        } else {
          // On UPDATE (PATCH), req.data only contains changed fields,
          // so task_ID may be absent. Read it from the entry in DB.
          const entryId =
            result?.ID ??
            (typeof req.params?.[0] === 'object' ? req.params[0].ID : req.params?.[0]);

          if (entryId) {
            // If the PATCH itself contains task_ID, use that (includes clearing via null)
            if ('task_ID' in (req.data ?? {})) {
              taskId = req.data.task_ID ?? undefined;
            } else {
              // task was not changed — fetch current value from DB
              const [entry] = await SELECT.from(TimesheetEntry)
                .columns('task_ID')
                .where({ ID: entryId });
              taskId = entry?.task_ID ?? undefined;
            }
          }
        }

        if (!taskId) return;

        const [task] = await SELECT.from(Task).columns('ID', 'status').where({ ID: taskId });
        // Only transition Open → InProgress (never downgrade Completed / Cancelled)
        if (task && task.status === 'Open') {
          await UPDATE(Task).set({ status: 'InProgress' }).where({ ID: taskId });
        }
      } catch (e) {
        // Never block entry save due to task status failure
        console.error('[TimesheetEntryHandler] Task status update failed:', e);
      }
    });

    // ── modifyEntryHours ──
    this.srv.on('modifyEntryHours', async (req: any) => {
      const { entryId, approvedHours } = req.data;
      const user = await resolveUser(req);
      if (!user) return req.reject(401, 'User not found');

      if (user.role !== 'TeamLead' && user.role !== 'Admin') {
        return req.reject(403, 'Only Team Leads or Admins can modify approved hours');
      }

      const db = cds.db || (await cds.connect.to('db'));
      const { TimesheetEntry } = db.entities('sap.timesheet');

      const [entry] = await SELECT.from(TimesheetEntry).where({ ID: entryId });
      if (!entry) return req.reject(404, 'Entry not found');

      const now = cds.context?.timestamp ?? new Date();
      await UPDATE(TimesheetEntry)
        .set({
          approvedHours: approvedHours,
          hoursModifiedBy_ID: user.ID,
          hoursModifiedAt: now,
        })
        .where({ ID: entryId });

      return 'Hours modified successfully';
    });
  }

  private async assertTimesheetIsEditable(req: any) {
    const db = cds.db || (await cds.connect.to('db'));
    const { Timesheet } = db.entities('sap.timesheet');

    let timesheetId = req.data?.timesheet_ID;
    if (!timesheetId && req.params?.[0]) {
      const { TimesheetEntry } = db.entities('sap.timesheet');
      const entryId = typeof req.params[0] === 'object' ? req.params[0].ID : req.params[0];
      const [entry] = await SELECT.from(TimesheetEntry).where({ ID: entryId });
      if (entry) timesheetId = entry.timesheet_ID;
    }
    if (!timesheetId) return;

    const [ts] = await SELECT.from(Timesheet).where({ ID: timesheetId });
    if (ts && ts.status !== 'Draft' && ts.status !== 'Reopened') {
      return req.reject(
        403,
        `Cannot modify entries – timesheet is "${ts.status}". Only Draft or Reopened timesheets can be edited.`
      );
    }
  }
}
