import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Calendar, LayoutDashboard, FolderKanban, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'
import { useTimesheetStore, MOCK_USERS } from '@/features/timesheet/store/timesheetStore'

const navigation = [
    { name: 'My Timesheet', href: '/timesheet', icon: Calendar },
    { name: 'Admin Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Projects', href: '/admin/projects', icon: FolderKanban },
]

export default function Sidebar() {
    const location = useLocation()
    const { currentUser, switchUser } = useTimesheetStore()
    const [isCollapsed, setIsCollapsed] = useState(false)

    const handleUserChange = (userId: string) => {
        switchUser(userId)
    }

    return (
        <div className={cn(
            "flex flex-col border-r bg-card transition-all duration-300",
            isCollapsed ? "w-20" : "w-64"
        )}>
            {/* Logo */}
            <div className="flex h-16 items-center border-b px-4 justify-between">
                {!isCollapsed && <h1 className="text-xl font-bold text-primary">Timesheet Mgmt</h1>}
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
            <nav className="flex-1 space-y-1 p-4">
                {navigation.map((item) => {
                    const isActive = location.pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            title={isCollapsed ? item.name : undefined}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                isCollapsed && 'justify-center'
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {!isCollapsed && item.name}
                        </Link>
                    )
                })}
            </nav>

            {/* Mock User Switcher - Hidden when collapsed */}
            {!isCollapsed && currentUser && (
                <div className="px-4 pb-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Switch User
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
                            <Button variant="ghost" size="icon">
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
