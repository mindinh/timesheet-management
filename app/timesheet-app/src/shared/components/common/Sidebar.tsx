import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  ClipboardList,
  LayoutDashboard,
  FolderKanban,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  BookOpen,
  Users,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import LanguageSwitcher from '@/shared/components/common/LanguageSwitcher';
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useSidebarStore } from '@/shared/store/sidebarStore';
import type { UserRole } from '@/shared/types';

const navigation: { nameKey: string; href: string; icon: React.ElementType; roles: UserRole[] }[] = [
  { nameKey: 'sidebar.myTimesheet', href: '/timesheet', icon: Calendar, roles: ['Employee', 'TeamLead', 'Admin'] },
  {
    nameKey: 'sidebar.myTimesheets',
    href: '/timesheets',
    icon: ClipboardList,
    roles: ['Employee', 'TeamLead', 'Admin'],
  },
  { nameKey: 'sidebar.myProjects', href: '/projects', icon: FolderKanban, roles: ['Employee', 'TeamLead', 'Admin'] },
  { nameKey: 'sidebar.approvals', href: '/approvals', icon: CheckSquare, roles: ['TeamLead', 'Admin'] },
  { nameKey: 'sidebar.myTeam', href: '/approvals/team', icon: Users, roles: ['TeamLead', 'Admin'] },
  { nameKey: 'sidebar.adminDashboard', href: '/admin', icon: LayoutDashboard, roles: ['Admin'] },
  { nameKey: 'sidebar.documents', href: '/docs', icon: BookOpen, roles: ['Employee', 'TeamLead', 'Admin'] },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user: authUser, logout: authLogout } = useAuthStore();
  const { logout: timesheetLogout } = useTimesheetStore();
  const { isCollapsed, toggle: toggleCollapsed } = useSidebarStore();

  const handleLogout = () => {
    timesheetLogout();
    authLogout();
    navigate('/');
  };

  const userRole: UserRole = (authUser?.role as UserRole) || 'Employee';
  const visibleNavigation = navigation.filter((item) => item.roles.includes(userRole));

  return (
    <div
      className={cn(
        'relative flex flex-col border-r bg-card transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center border-b px-4 justify-center">
        {!isCollapsed ? (
          <h1 className="text-xl font-bold text-primary">{t('sidebar.title')}</h1>
        ) : (
          <img src="/logo.jpg" alt="logo" className="w-10 h-10" />
        )}
      </div>

      {/* Collapse toggle — circle vertically centered on the right border */}
      <button
        onClick={toggleCollapsed}
        className="absolute top-1/2 -translate-y-1/2 -right-3 z-30 flex h-6 w-6 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-accent transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {visibleNavigation.map((item) => {
          // special case for exact matching for some nested routes
          const isActive =
            item.href === '/approvals'
              ? location.pathname === '/approvals' || location.pathname.match(/^\/approvals\/[a-zA-Z0-9-]{12,}$/)
              : location.pathname === item.href;
          const label = t(item.nameKey);
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
          );
        })}
      </nav>

      {/* Language Switcher */}
      <LanguageSwitcher isCollapsed={isCollapsed} />

      {/* Mock User Switcher */}

      {/* Current User Info */}
      <div className={cn('flex p-4 border-t border-border', isCollapsed && 'justify-center')}>
        {authUser ? (
          <>
            <div className={cn('flex text-left items-center', !isCollapsed && 'w-full')}>
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium',
                  !isCollapsed && 'mr-3'
                )}
              >
                {authUser.firstName?.[0]}
                {authUser.lastName?.[0]}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-sm">
                    {authUser.firstName} {authUser.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">{authUser.role}</span>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </>
        ) : (
          <div className="text-sm text-muted-foreground">{isCollapsed ? '...' : 'Loading...'}</div>
        )}
      </div>
    </div>
  );
}
