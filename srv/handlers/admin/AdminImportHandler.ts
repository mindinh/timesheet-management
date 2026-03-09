import cds from '@sap/cds';
import * as xlsx from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { resolveUser } from '../../lib/user-resolver';

export class AdminImportHandler {
  private srv: any;

  constructor(srv: any) {
    this.srv = srv;
  }

  register() {
    this.srv.on('runreport', this.onRunReport.bind(this));
    this.srv.on('clearDatabase', this.onClearDatabase.bind(this));
  }

  private async onClearDatabase(req: any) {
    // const admin = await resolveUser(req)
    // if (!admin) return req.reject(401, 'Admin user not found')

    try {
      const db = cds.db || (await cds.connect.to('db'));
      const {
        ExportLog,
        AuditLog,
        BatchHistory,
        ApprovalHistory,
        TimesheetEntry,
        Timesheet,
        TimesheetBatch,
        Task,
        Project,
        User,
      } = db.entities('sap.timesheet');

      // Delete in FK-safe order (children first)
      const tables = [
        { entity: ExportLog, name: 'ExportLog' },
        { entity: AuditLog, name: 'AuditLog' },
        { entity: BatchHistory, name: 'BatchHistory' },
        { entity: ApprovalHistory, name: 'ApprovalHistory' },
        { entity: TimesheetEntry, name: 'TimesheetEntry' },
        { entity: Timesheet, name: 'Timesheet' },
        { entity: TimesheetBatch, name: 'TimesheetBatch' },
        { entity: Task, name: 'Task' },
        { entity: Project, name: 'Project' },
        { entity: User, name: 'User' },
      ];

      const results: string[] = [];
      for (const { entity, name } of tables) {
        const count = await SELECT.from(entity).columns('count(*) as cnt');
        const cnt = count[0]?.cnt || 0;
        if (cnt > 0) {
          await DELETE.from(entity);
          results.push(`${name}: ${cnt} deleted`);
        }
      }

      return results.length > 0
        ? `Database cleared successfully. ${results.join(', ')}.`
        : 'Database is already empty.';
    } catch (error: any) {
      console.error('clearDatabase error:', error);
      return req.reject(500, `Failed to clear database: ${error.message}`);
    }
  }

  private async onRunReport(req: any) {
    const { base64Data } = req.data as { base64Data: string };
    if (!base64Data) {
      return req.reject(400, 'base64Data is required');
    }

    // const admin = await resolveUser(req)
    // if (!admin) return req.reject(401, 'Admin user not found')

    try {
      const base64String = base64Data.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(base64String, 'base64');
      const workbook = xlsx.read(buffer, { type: 'buffer' });

      const db = cds.db || (await cds.connect.to('db'));
      const {
        User,
        Project,
        Task,
        TimesheetBatch,
        Timesheet,
        TimesheetEntry,
        ApprovalHistory,
        BatchHistory,
        AuditLog,
        ExportLog,
      } = db.entities('sap.timesheet');

      // ── Auto-clear DB before import (children first to satisfy FK constraints) ──
      for (const entity of [ExportLog, AuditLog, BatchHistory, ApprovalHistory, TimesheetEntry, Timesheet, TimesheetBatch, Task, Project, User]) {
        await DELETE.from(entity);
      }

      const summary: Record<string, number> = {
        users: 0,
        projects: 0,
        tasks: 0,
        batches: 0,
        timesheets: 0,
        entries: 0,
        approvalHistory: 0,
        batchHistory: 0,
        auditLog: 0,
        exportLog: 0,
      };

      // ── 1. Users ──────────────────────────────────────────────────────────
      const userMap = new Map<string, string>();
      const userSheet = workbook.Sheets['Users'];
      if (userSheet) {
        const rows = xlsx.utils.sheet_to_json<any>(userSheet);
        for (const row of rows) {
          if (!row.email) continue;
          const existing = await SELECT.one.from(User).where({ email: row.email });
          let userId = existing?.ID;
          if (!existing) {
            userId = uuidv4();
            await INSERT.into(User).entries({
              ID: userId,
              email: row.email,
              firstName: row.firstName,
              lastName: row.lastName,
              role: row.role || 'Employee',
              isActive: row.isActive !== undefined ? row.isActive : true,
            });
            summary.users++;
          }
          userMap.set(row.email, userId);
        }
        // second pass to resolve managers
        for (const row of rows) {
          if (row.manager_email && userMap.has(row.email) && userMap.has(row.manager_email)) {
            await UPDATE(User)
              .set({ manager_ID: userMap.get(row.manager_email) })
              .where({ ID: userMap.get(row.email) });
          }
        }
      } else {
        const all = await SELECT.from(User);
        all.forEach((u: any) => userMap.set(u.email, u.ID));
      }

      // ── 2. Projects ───────────────────────────────────────────────────────
      const projectMap = new Map<string, string>();
      const projectSheet = workbook.Sheets['Projects'];
      if (projectSheet) {
        const rows = xlsx.utils.sheet_to_json<any>(projectSheet);
        for (const row of rows) {
          if (!row.code || !row.name) continue;
          const existing = await SELECT.one.from(Project).where({ code: row.code });
          let projectId = existing?.ID;
          if (!existing) {
            projectId = uuidv4();
            await INSERT.into(Project).entries({
              ID: projectId,
              name: row.name,
              description: row.description,
              type: row.type || 'Others',
              code: row.code,
              isActive: row.isActive !== undefined ? row.isActive : true,
              user_ID: row.user_email ? userMap.get(row.user_email) : null,
            });
            summary.projects++;
          }
          projectMap.set(row.code, projectId);
        }
      } else {
        const all = await SELECT.from(Project);
        all.forEach((p: any) => projectMap.set(p.code, p.ID));
      }

      // ── 3. Tasks ──────────────────────────────────────────────────────────
      const taskMap = new Map<string, string>();
      const taskSheet = workbook.Sheets['Tasks'];
      if (taskSheet) {
        const rows = xlsx.utils.sheet_to_json<any>(taskSheet);
        for (const row of rows) {
          if (!row.name || !row.project_code || !projectMap.has(row.project_code)) continue;
          const projectId = projectMap.get(row.project_code);
          const existing = await SELECT.one.from(Task).where({ name: row.name, project_ID: projectId });
          let taskId = existing?.ID;
          if (!existing) {
            taskId = uuidv4();
            await INSERT.into(Task).entries({
              ID: taskId,
              project_ID: projectId,
              name: row.name,
              description: row.description,
              startDate: row.startDate || null,
              endDate: row.endDate || null,
              status: row.status || 'Open',
            });
            summary.tasks++;
          }
          taskMap.set(`${row.project_code}:${row.name}`, taskId);
        }
      } else {
        const allTasks = await SELECT.from(Task).columns('ID', 'name', 'project_ID');
        const allProjects = await SELECT.from(Project).columns('ID', 'code');
        const projIdToCode = new Map(allProjects.map((p: any) => [p.ID, p.code]));
        for (const t of allTasks) {
          const pCode = projIdToCode.get(t.project_ID);
          if (pCode) taskMap.set(`${pCode}:${t.name}`, t.ID);
        }
      }

      // ── 4. TimesheetBatches ───────────────────────────────────────────────
      const batchMap = new Map<string, string>();
      const batchSheet = workbook.Sheets['TimesheetBatches'];
      if (batchSheet) {
        const rows = xlsx.utils.sheet_to_json<any>(batchSheet);
        for (const row of rows) {
          const teamLeadId = row.teamLead_email ? userMap.get(row.teamLead_email) : null;
          // admin_ID is now optional – batch is created when employee submits, admin set later when TL forwards
          const adminId = row.admin_email ? userMap.get(row.admin_email) : null;
          if (!teamLeadId) continue; // teamLead is still required

          let batchId: string;
          if (row.ID) {
            const existing = await SELECT.one.from(TimesheetBatch).where({ ID: row.ID });
            if (existing) {
              batchMap.set(row.ID, row.ID);
              continue;
            }
            batchId = row.ID;
          } else {
            batchId = uuidv4();
          }

          await INSERT.into(TimesheetBatch).entries({
            ID: batchId,
            teamLead_ID: teamLeadId,
            admin_ID: adminId || null,
            month: row.month ? parseInt(row.month) : null,
            year: row.year ? parseInt(row.year) : null,
            status: row.status || 'Pending',
          });
          summary.batches++;
          batchMap.set(batchId, batchId);
        }
      }

      // ── 5. Timesheets ─────────────────────────────────────────────────────
      const timesheetCache = new Map<string, string>();
      const timesheetSheet = workbook.Sheets['Timesheets'];
      if (timesheetSheet) {
        const rows = xlsx.utils.sheet_to_json<any>(timesheetSheet);
        for (const row of rows) {
          if (!row.user_email || !row.month || !row.year) continue;
          const userId = userMap.get(row.user_email);
          if (!userId) continue;

          const tsKey = `${row.user_email}:${row.year}:${row.month}`;
          const existing = await SELECT.one
            .from(Timesheet)
            .where({ user_ID: userId, month: row.month, year: row.year });
          let tsId = existing?.ID;
          if (!existing) {
            tsId = uuidv4();
            await INSERT.into(Timesheet).entries({
              ID: tsId,
              user_ID: userId,
              month: row.month,
              year: row.year,
              status: row.status || 'Draft',
              submitDate: row.submitDate || null,
              approveDate: row.approveDate || null,
              finishedDate: row.finishedDate || null,
              currentApprover_ID: row.currentApprover_email ? userMap.get(row.currentApprover_email) : null,
              batch_ID: row.batch_ID && batchMap.has(row.batch_ID) ? row.batch_ID : null,
              comment: row.comment || null,
            });
            summary.timesheets++;
          }
          timesheetCache.set(tsKey, tsId as string);
        }
      }

      // ── 6. TimesheetEntries ───────────────────────────────────────────────
      const entriesSheet = workbook.Sheets['TimesheetEntries'];
      if (entriesSheet) {
        const rows = xlsx.utils.sheet_to_json<any>(entriesSheet);
        for (const row of rows) {
          if (!row.user_email || !row.date || !row.loggedHours || !row.project_code) continue;
          const userId = userMap.get(row.user_email);
          const projectId = projectMap.get(row.project_code);
          if (!userId || !projectId) continue;

          let entryDate = new Date(row.date);
          if (isNaN(entryDate.getTime())) {
            if (typeof row.date === 'number') {
              entryDate = new Date(Date.UTC(0, 0, row.date - 1));
            } else continue;
          }

          const dateStr = entryDate.toISOString().split('T')[0];
          const year = entryDate.getUTCFullYear();
          const month = entryDate.getUTCMonth() + 1;
          const tsKey = `${row.user_email}:${year}:${month}`;
          let timesheetId = timesheetCache.get(tsKey);

          if (!timesheetId) {
            const existingTs = await SELECT.one.from(Timesheet).where({ user_ID: userId, month, year });
            timesheetId = existingTs?.ID;
            if (!existingTs) {
              timesheetId = uuidv4();
              await INSERT.into(Timesheet).entries({
                ID: timesheetId,
                user_ID: userId,
                month,
                year,
                status: row.ts_status || 'Submitted',
              });
              summary.timesheets++;
            }
            timesheetCache.set(tsKey, timesheetId as string);
          }

          const taskId = row.task_name ? taskMap.get(`${row.project_code}:${row.task_name}`) : null;
          const existingEntryQuery: any = { timesheet_ID: timesheetId, project_ID: projectId, date: dateStr };
          if (taskId) existingEntryQuery.task_ID = taskId;

          const existingEntry = await SELECT.one.from(TimesheetEntry).where(existingEntryQuery);
          if (!existingEntry) {
            await INSERT.into(TimesheetEntry).entries({
              ID: uuidv4(),
              timesheet_ID: timesheetId,
              project_ID: projectId,
              task_ID: taskId,
              date: dateStr,
              loggedHours: parseFloat(row.loggedHours),
              approvedHours: row.approvedHours ? parseFloat(row.approvedHours) : null,
              description: row.description || null,
              // Note: no entry-level status – TimesheetEntry no longer has a status field
            });
            summary.entries++;
          }
        }
      }

      // ── 7. ApprovalHistory ────────────────────────────────────────────────
      const approvalSheet = workbook.Sheets['ApprovalHistory'];
      if (approvalSheet) {
        const rows = xlsx.utils.sheet_to_json<any>(approvalSheet);
        for (const row of rows) {
          if (!row.actor_email || !row.action || !row.timestamp) continue;
          const actorId = userMap.get(row.actor_email);
          if (!actorId) continue;

          // resolve timesheet by user_email + month + year
          let timesheetId: string | undefined;
          if (row.timesheet_user_email && row.timesheet_month && row.timesheet_year) {
            const tsKey = `${row.timesheet_user_email}:${row.timesheet_year}:${row.timesheet_month}`;
            timesheetId = timesheetCache.get(tsKey);
            if (!timesheetId) {
              const tsUserId = userMap.get(row.timesheet_user_email);
              if (tsUserId) {
                const ts = await SELECT.one
                  .from(Timesheet)
                  .where({ user_ID: tsUserId, month: row.timesheet_month, year: row.timesheet_year });
                timesheetId = ts?.ID;
              }
            }
          }
          if (!timesheetId) continue;

          await INSERT.into(ApprovalHistory).entries({
            ID: uuidv4(),
            timesheet_ID: timesheetId,
            actor_ID: actorId,
            action: row.action,
            fromStatus: row.fromStatus || null,
            toStatus: row.toStatus || null,
            comment: row.comment || null,
            timestamp: row.timestamp,
          });
          summary.approvalHistory++;
        }
      }

      // ── 8. BatchHistory ───────────────────────────────────────────────────
      const batchHistSheet = workbook.Sheets['BatchHistory'];
      if (batchHistSheet) {
        const rows = xlsx.utils.sheet_to_json<any>(batchHistSheet);
        for (const row of rows) {
          if (!row.batch_ID || !row.actor_email || !row.action || !row.timestamp) continue;
          const actorId = userMap.get(row.actor_email);
          if (!actorId || !batchMap.has(row.batch_ID)) continue;

          await INSERT.into(BatchHistory).entries({
            ID: uuidv4(),
            batch_ID: row.batch_ID,
            actor_ID: actorId,
            action: row.action,
            status: row.status || null,
            comment: row.comment || null,
            timestamp: row.timestamp,
          });
          summary.batchHistory++;
        }
      }

      // ── 9. AuditLog ──────────────────────────────────────────────────────
      const auditSheet = workbook.Sheets['AuditLog'];
      if (auditSheet) {
        const rows = xlsx.utils.sheet_to_json<any>(auditSheet);
        for (const row of rows) {
          if (!row.entity_ || !row.entityId || !row.action) continue;
          await INSERT.into(AuditLog).entries({
            ID: uuidv4(),
            entity_: row.entity_,
            entityId: row.entityId,
            action: row.action,
            userId: row.userId || null,
            changes: row.changes || null,
          });
          summary.auditLog++;
        }
      }

      // ── 10. ExportLog ─────────────────────────────────────────────────────
      const exportSheet = workbook.Sheets['ExportLog'];
      if (exportSheet) {
        const rows = xlsx.utils.sheet_to_json<any>(exportSheet);
        for (const row of rows) {
          if (!row.exportedBy_email || !row.exportDate) continue;
          const exportedById = userMap.get(row.exportedBy_email);
          if (!exportedById) continue;

          await INSERT.into(ExportLog).entries({
            ID: uuidv4(),
            exportedBy_ID: exportedById,
            exportDate: row.exportDate,
            fromDate: row.fromDate || null,
            toDate: row.toDate || null,
            userId: row.userId || null,
            projectId: row.projectId || null,
            totalEntries: row.totalEntries || 0,
            filePath: row.filePath || null,
            filters: row.filters || null,
          });
          summary.exportLog++;
        }
      }

      const parts = Object.entries(summary)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`);

      return `Report executed successfully. Inserted: ${parts.join(', ') || 'no new records (all data already exists).'}`;
    } catch (error: any) {
      console.error('runreport error:', error);
      return req.reject(500, `Failed to process runreport: ${error.message}`);
    }
  }
}
