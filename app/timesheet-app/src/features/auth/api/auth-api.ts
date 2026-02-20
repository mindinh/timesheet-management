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
    const data: any = await api.get(AUTH_URL.userById(userId), { $expand: 'manager' })
    return {
        id: data.ID,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        manager: data.manager
            ? {
                id: data.manager.ID,
                firstName: data.manager.firstName,
                lastName: data.manager.lastName,
                role: data.manager.role,
            }
            : undefined,
    }
}

// ---------- Potential Approvers ----------

export async function getPotentialApprovers(): Promise<
    { id: string; firstName: string; lastName: string; role: string; email: string }[]
> {
    const data: any = await api.get(AUTH_URL.users, {
        $filter: `role eq 'TeamLead' or role eq 'Admin'`,
    })
    const list = data.value || data
    return list.map((u: any) => ({
        id: u.ID,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        email: u.email,
    }))
}
