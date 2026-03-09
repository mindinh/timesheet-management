import cds from '@sap/cds';
import { resolveUser } from '../../lib/user-resolver';

/**
 * ProjectHandler
 * - Projects and Tasks are visible to ALL authenticated users.
 * - Every CREATE / UPDATE / DELETE on Project or Task is recorded in ProjectAuditLog.
 */
export class ProjectHandler {
  private srv: any;

  constructor(srv: any) {
    this.srv = srv;
  }

  register() {
    const { Projects, Tasks } = this.srv.entities;

    // ── Helpers ────────────────────────────────────────────────────────────

    const writeAuditLog = async (
      req: any,
      entity: 'Project' | 'Task',
      entityId: string,
      action: 'Created' | 'Updated' | 'Deleted',
      changes?: Record<string, unknown>,
      projectId?: string
    ) => {
      try {
        const db = cds.db || (await cds.connect.to('db'));
        const { ProjectAuditLog } = db.entities('sap.timesheet');
        const user = await resolveUser(req);
        await INSERT.into(ProjectAuditLog).entries({
          entity_: entity,
          entityId,
          action,
          actor_ID: user?.ID ?? null,
          project_ID: projectId ?? null,
          changes: changes ? JSON.stringify(changes) : null,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        // Audit log failure must never break the main operation
        console.error('[ProjectHandler] Audit log write failed:', e);
      }
    };

    // ── Project hooks ─────────────────────────────────────────────────────

    this.srv.after('CREATE', Projects, async (result: any, req: any) => {
      const id = result?.ID ?? req.data?.ID;
      if (!id) return;
      await writeAuditLog(req, 'Project', id, 'Created', {
        name: result?.name ?? req.data?.name,
        code: result?.code ?? req.data?.code,
        type: result?.type ?? req.data?.type,
      });
    });

    this.srv.after('UPDATE', Projects, async (result: any, req: any) => {
      const id = req.params?.[0]?.ID ?? req.params?.[0] ?? result?.ID;
      if (!id) return;
      await writeAuditLog(req, 'Project', String(id), 'Updated', req.data, String(id));
    });

    this.srv.after('DELETE', Projects, async (result: any, req: any) => {
      const id = req.params?.[0]?.ID ?? req.params?.[0];
      if (!id) return;
      await writeAuditLog(req, 'Project', String(id), 'Deleted');
    });

    // ── Task hooks ────────────────────────────────────────────────────────

    // Auto-set status to InProgress when a task is created
    this.srv.before('CREATE', Tasks, (req: any) => {
      req.data.status = 'InProgress';
    });

    this.srv.after('CREATE', Tasks, async (result: any, req: any) => {
      const id = result?.ID ?? req.data?.ID;
      const projectId = result?.project_ID ?? req.data?.project_ID;
      if (!id) return;
      await writeAuditLog(
        req,
        'Task',
        id,
        'Created',
        {
          name: result?.name ?? req.data?.name,
          status: result?.status ?? req.data?.status,
          projectId,
        },
        projectId
      );
    });

    this.srv.after('UPDATE', Tasks, async (result: any, req: any) => {
      const id = req.params?.[0]?.ID ?? req.params?.[0] ?? result?.ID;
      const projectId = result?.project_ID ?? req.data?.project_ID;
      if (!id) return;
      await writeAuditLog(req, 'Task', String(id), 'Updated', req.data, projectId);
    });

    this.srv.after('DELETE', Tasks, async (result: any, req: any) => {
      const id = req.params?.[0]?.ID ?? req.params?.[0];
      if (!id) return;
      await writeAuditLog(req, 'Task', String(id), 'Deleted');
    });
  }
}
