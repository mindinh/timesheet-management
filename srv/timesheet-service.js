const cds = require('@sap/cds')

module.exports = cds.service.impl(async function () {
    const { Projects } = this.entities

    // Auto-set user_ID to current user on project creation
    this.before('CREATE', Projects, async (req) => {
        // Use createdBy from managed aspect as user identifier
        // In dev mode, CAP uses anonymous or mock user
        const userId = req.user?.id || 'anonymous'

        // Find or create User entity for the current user
        const db = cds.db || await cds.connect.to('db')
        const { User } = db.entities('sap.timesheet')

        let [user] = await SELECT.from(User).where({ email: userId })
        if (!user) {
            // Auto-create user if not exists (dev convenience)
            user = await INSERT.into(User).entries({
                email: userId,
                firstName: 'Default',
                lastName: 'User',
                role: 'Employee',
                isActive: true,
            })
                // Re-fetch to get the generated ID
                ;[user] = await SELECT.from(User).where({ email: userId })
        }

        req.data.user_ID = user.ID
    })

    // Filter projects to only show current user's projects
    this.before('READ', Projects, async (req) => {
        const userId = req.user?.id || 'anonymous'

        const db = cds.db || await cds.connect.to('db')
        const { User } = db.entities('sap.timesheet')

        const [user] = await SELECT.from(User).where({ email: userId })
        if (user) {
            // Add filter to only return user's projects
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
