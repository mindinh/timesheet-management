import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/shared/components/common/Sidebar';

const PAGE_TITLES: Record<string, string> = {
  '/timesheet': 'Log Timesheet',
  '/timesheets': 'Timesheet Worklist',
  '/projects': 'Projects',
  '/approvals': 'Approvals',
  '/approvals/team': 'Team Management',
  '/admin': 'Admin Dashboard',
  '/admin/batches': 'Timesheet Batches',
  '/docs': 'Documentation',
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Prefix match (e.g. /admin/batches/123)
  const prefix = Object.keys(PAGE_TITLES)
    .filter((k) => pathname.startsWith(k) && k !== '/')
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? PAGE_TITLES[prefix] : '';
}

export default function MainLayout() {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar — aligns with sidebar h-16 header */}
        {pageTitle && (
          <header className="flex h-16 items-center border-b bg-card px-6 shrink-0">
            <h1 className="text-xl font-bold text-primary">{pageTitle}</h1>
          </header>
        )}

        <main className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
