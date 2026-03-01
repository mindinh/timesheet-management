import { api } from '@/shared/api/http'
import { AUTH_URL } from './auth-url'
import type { User } from '@/shared/types'

export interface UserInfoResponse {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
    manager?: { id: string; firstName: string; lastName: string; role: string }
}

// ---------- User Info ----------

export async function getUserInfo(): Promise<UserInfoResponse> {
    return api.get(AUTH_URL.userInfo)
}

export async function getUserWithManager(userId: string): Promise<Omit<User, 'email'>> {
    const data: unknown = await api.get(AUTH_URL.userById(userId), { $expand: 'manager' })
    const user = data as { ID: string; firstName: string; lastName: string; role: string; manager?: { ID: string; firstName: string; lastName: string; role: string } }
    return {
        id: user.ID,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        manager: user.manager
            ? {
                id: user.manager.ID,
                firstName: user.manager.firstName,
                lastName: user.manager.lastName,
                role: user.manager.role,
            }
            : undefined,
    }
}

// ---------- Potential Approvers ----------

export async function getPotentialApprovers(): Promise<
    { id: string; firstName: string; lastName: string; role: string; email: string }[]
> {
    const data: unknown = await api.get(AUTH_URL.users, {
        $filter: `role eq 'TeamLead' or role eq 'Admin'`,
    })
    const list = (data && typeof data === 'object' && 'value' in data ? (data as any).value : data) as { ID: string; firstName: string; lastName: string; role: string; email: string }[]
    return list.map(u => ({
        id: u.ID,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        email: u.email,
    }))
}
