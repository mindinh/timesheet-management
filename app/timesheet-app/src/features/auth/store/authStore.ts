import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@/shared/types'

interface AuthState {
    user: {
        id: string
        name: string
        role: UserRole
    } | null
    login: (role: UserRole) => void
    logout: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: {
                id: 'user-1',
                name: 'Alice',
                role: 'Employee',
            },
            login: (role) =>
                set({
                    user: {
                        id: role === 'Admin' ? 'admin-1' : role === 'TeamLead' ? 'lead-1' : 'user-1',
                        name: role === 'Admin' ? 'Admin User' : role === 'TeamLead' ? 'Bob Lead' : 'Alice',
                        role,
                    },
                }),
            logout: () => set({ user: null }),
        }),
        {
            name: 'auth-storage', // name of the item in the storage (must be unique)
        }
    )
)
