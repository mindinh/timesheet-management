import cds from '@sap/cds'

/**
 * Resolve user from DB by trying: UUID → email → username@example.com pattern
 * Supports x-mock-user header for frontend user switching in dev.
 */
export async function resolveUser(req: any) {
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
