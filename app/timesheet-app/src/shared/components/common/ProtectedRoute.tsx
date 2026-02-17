import { Navigate } from 'react-router-dom'
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore'
import type { UserRole } from '@/shared/types'

interface ProtectedRouteProps {
    allowedRoles: UserRole[]
    children: React.ReactNode
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
    const { currentUser } = useTimesheetStore()

    if (!currentUser) {
        // Still loading user data — show nothing or a loader
        return null
    }

    if (!allowedRoles.includes(currentUser.role as UserRole)) {
        return <Navigate to="/timesheet" replace />
    }

    return <>{children}</>
}
