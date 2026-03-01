import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, ClipboardList, LayoutDashboard, FolderKanban, LogOut, ChevronLeft, ChevronRight, CheckSquare, BookOpen } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'
import LanguageSwitcher from '@/shared/components/common/LanguageSwitcher'
import { useTimesheetStore, MOCK_USERS } from '@/features/timesheet/store/timesheetStore'
import { useAuthStore } from '@/features/auth/store/authStore'
import type { UserRole } from '@/shared/types'

const navigation: { nameKey: string; href: string; icon: any; roles: UserRole[] }[] = [
    { nameKey: 'sidebar.myTimesheet', href: '/timesheet', icon: Calendar, roles: ['Employee', 'TeamLead', 'Admin'] },
    { nameKey: 'sidebar.myTimesheets', href: '/timesheets', icon: ClipboardList, roles: ['Employee', 'TeamLead', 'Admin'] },
    { nameKey: 'sidebar.myProjects', href: '/projects', icon: FolderKanban, roles: ['Employee', 'TeamLead', 'Admin'] },
    { nameKey: 'sidebar.approvals', href: '/approvals', icon: CheckSquare, roles: ['TeamLead', 'Admin'] },
    { nameKey: 'sidebar.adminDashboard', href: '/admin', icon: LayoutDashboard, roles: ['Admin'] },
    { nameKey: 'sidebar.documents', href: '/docs', icon: BookOpen, roles: ['Employee', 'TeamLead', 'Admin'] },
]

export default function Sidebar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { currentUser, switchUser, logout } = useTimesheetStore()
    const { user: authUser, login } = useAuthStore()
    const [isCollapsed, setIsCollapsed] = useState(false)

    useEffect(() => {
        // Hydrate timesheet store based on auth store if timesheet store is empty
        if (!currentUser && authUser) {
            const matchedUser = MOCK_USERS.find(u => u.role === authUser.role)
            if (matchedUser) {
                switchUser(matchedUser.id)
            }
        } else if (!authUser && !currentUser) {
            // Default fallback if somehow both are empty
            login('Employee')
            switchUser(MOCK_USERS[0].id)
        }
    }, [authUser, currentUser, switchUser, login])

    const handleUserChange = (userId: string) => {
        const user = MOCK_USERS.find(u => u.id === userId)
        if (user) {
            login(user.role as UserRole)
        }
        switchUser(userId)
    }

    // Filter navigation items based on current user's role
    const userRole = (currentUser?.role as UserRole) || 'Employee'
    const visibleNavigation = navigation.filter(item => item.roles.includes(userRole))

    return (
        <div className={cn(
            "flex flex-col border-r bg-card transition-all duration-300",
            isCollapsed ? "w-20" : "w-64"
        )}>
            <div className="flex h-16 items-center border-b px-4 justify-between">
                {!isCollapsed ? <h1 className="text-xl font-bold text-primary">{t('sidebar.title')}</h1> : <img src="/logo.jpg" alt="logo" className='w-10 h-10' />}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={cn(isCollapsed && "mx-auto")}
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-5 w-5" />
                    ) : (
                        <ChevronLeft className="h-5 w-5" />
                    )}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
                {visibleNavigation.map((item) => {
                    const isActive = location.pathname === item.href
                    const label = t(item.nameKey)
                    return (
                        <Link
                            key={item.nameKey}
                            to={item.href}
                            title={isCollapsed ? label : undefined}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                isCollapsed && 'justify-center'
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {!isCollapsed && label}
                        </Link>
                    )
                })}
            </nav>

            {/* Language Switcher */}
            <LanguageSwitcher isCollapsed={isCollapsed} />

            {/* Mock User Switcher - Hidden when collapsed */}
            {!isCollapsed && currentUser && (
                <div className="px-4 pb-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        {t('sidebar.switchUser')}
                    </label>
                    <Select value={currentUser.id} onValueChange={handleUserChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MOCK_USERS.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName} ({user.role})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Current User Info */}
            <div className={cn(
                "flex p-4 border-t border-border",
                isCollapsed && "justify-center"
            )}>
                {currentUser ? (
                    <>
                        <div className={cn(
                            "flex text-left items-center",
                            !isCollapsed && "w-full"
                        )}>
                            <div className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium",
                                !isCollapsed && "mr-3"
                            )}>
                                {currentUser.firstName[0]}{currentUser.lastName[0]}
                            </div>
                            {!isCollapsed && (
                                <div className="flex flex-col">
                                    <span className="text-sm">{currentUser.firstName} {currentUser.lastName}</span>
                                    <span className="text-xs text-muted-foreground">{currentUser.role}</span>
                                </div>
                            )}
                        </div>
                        {!isCollapsed && (
                            <Button variant="ghost" size="icon" onClick={() => { logout(); navigate('/') }}>
                                <LogOut className="h-5 w-5" />
                            </Button>
                        )}
                    </>
                ) : (
                    <div className="text-sm text-muted-foreground">
                        {isCollapsed ? '...' : 'Loading user...'}
                    </div>
                )}
            </div>
        </div>
    )
}
