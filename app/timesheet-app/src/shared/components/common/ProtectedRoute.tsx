import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'
import type { UserRole } from '@/shared/types'

interface ProtectedRouteProps {
    allowedRoles: UserRole[]
    children: React.ReactNode
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
    const { user } = useAuthStore()

    if (!user) {
        // Not logged in or loading
        return <Navigate to="/timesheet" replace />
    }

    if (!allowedRoles.includes(user.role as UserRole)) {
        return <Navigate to="/timesheet" replace />
    }

    return <>{children}</>
}
