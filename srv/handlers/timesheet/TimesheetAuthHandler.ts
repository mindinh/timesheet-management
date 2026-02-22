import cds from '@sap/cds'
import { resolveUser } from '../../lib/user-resolver'

/**
 * TimesheetAuthHandler
 * Handles user identity resolution and entity-level access filtering.
 */
export class TimesheetAuthHandler {
    private srv: any

    constructor(srv: any) {
        this.srv = srv
    }

    register() {
        const { Projects, Timesheets } = this.srv.entities

        // ── userInfo: return the effective user profile ──
        this.srv.on('userInfo', async (req: any) => {
            const user = await resolveUser(req)
            if (!user) {
                return req.reject(404, `User not found`)
            }
            return {
                id: user.ID,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            }
        })

        // Auto-set user_ID on project creation based on effective user
        this.srv.before('CREATE', Projects, async (req: any) => {
            const user = await resolveUser(req)
            if (!user) {
                const userId = req.headers?.['x-mock-user'] || req.user.id
                const db = cds.db || await cds.connect.to('db')
                const { User } = db.entities('sap.timesheet')
                // Auto-create if not exists (dev convenience)
                await INSERT.into(User).entries({
                    email: `${userId}@example.com`,
                    firstName: userId,
                    lastName: 'User',
                    role: 'Employee',
                    isActive: true,
                })
                const [newUser] = await SELECT.from(User).where({ email: `${userId}@example.com` })
                req.data.user_ID = newUser.ID
            } else {
                req.data.user_ID = user.ID
            }
        })

        // Filter projects to only show effective user's projects
        this.srv.before('READ', Projects, async (req: any) => {
            const user = await resolveUser(req)
            if (user) {
                if (!req.query.SELECT.where) {
                    req.query.SELECT.where = []
                } else {
                    req.query.SELECT.where.push('and')
                }
                req.query.SELECT.where.push(
                    { ref: ['user_ID'] }, '=', { val: user.ID }
                )
            }
        })

        // Filter timesheets: show user's own OR timesheets where user is currentApprover
        this.srv.before('READ', Timesheets, async (req: any) => {
            const user = await resolveUser(req)
            if (user) {
                if (!req.query.SELECT.where) {
                    req.query.SELECT.where = []
                } else {
                    req.query.SELECT.where.push('and')
                }
                // Show own timesheets OR timesheets where this user is the current approver
                req.query.SELECT.where.push(
                    '(',
                    { ref: ['user_ID'] }, '=', { val: user.ID },
                    'or',
                    { ref: ['currentApprover_ID'] }, '=', { val: user.ID },
                    ')'
                )
            }
        })
    }
}
