import { create } from 'zustand'
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

export const useAuthStore = create<AuthState>((set) => ({
    user: {
        id: 'user-1',
        name: 'Alice',
        role: 'Employee',
    },
    login: (role) =>
        set({
            user: {
                id: role === 'Admin' ? 'admin-1' : 'user-1',
                name: role === 'Admin' ? 'Admin User' : 'Alice',
                role,
            },
        }),
    logout: () => set({ user: null }),
}))
