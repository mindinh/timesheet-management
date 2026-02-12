const cds = require('@sap/cds')

module.exports = cds.service.impl(async function () {
    const { Projects, Users } = this.entities

    /**
     * Resolve user from DB by trying: UUID → email → username@example.com pattern
     * Supports x-mock-user header for frontend user switching in dev.
     */
    async function resolveUser(req) {
        const mockUserId = req.headers?.['x-mock-user']
        const userId = mockUserId || req.user.id
        const db = cds.db || await cds.connect.to('db')
        const { User } = db.entities('sap.timesheet')

        let [user] = await SELECT.from(User).where({ ID: userId })
        if (!user) {
            [user] = await SELECT.from(User).where({ email: userId })
        }
        if (!user) {
            const email = `${userId}@example.com`
                ;[user] = await SELECT.from(User).where({ email })
        }
        return user
    }

    // --- userInfo: return the effective user profile ---
    this.on('userInfo', async (req) => {
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
    this.before('CREATE', Projects, async (req) => {
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
    this.before('READ', Projects, async (req) => {
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
})
