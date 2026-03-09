import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import MainLayout from '@/shared/layouts/MainLayout';
import TimesheetPage from '@/features/timesheet/pages/TimesheetPage';
import TimesheetListPage from '@/features/timesheet/pages/TimesheetListPage';
import ApprovalsPage from '@/features/approvals/pages/ApprovalsPage';
import TimesheetReviewPage from '@/features/approvals/pages/TimesheetReviewPage';
import TeamMembersPage from '@/features/approvals/pages/TeamMembersPage';
import BatchDetailPage from '@/features/approvals/pages/BatchDetailPage';
import AdminDashboard from '@/features/admin/pages/AdminDashboard';
import AdminBatchPage from '@/features/admin/pages/AdminBatchPage';
import AdminBatchDetailPage from '@/features/admin/pages/AdminBatchDetailPage';
import ProjectsPage from '@/features/projects/pages/ProjectsPage';
import DocsPage from '@/features/docs/pages/DocsPage';
import ProtectedRoute from '@/shared/components/common/ProtectedRoute';
import LoginPage from '@/features/auth/pages/LoginPage';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useTimesheetStore } from '@/features/timesheet/store/timesheetStore';

function App() {
  const { user, isRestoring, restoreSession } = useAuthStore();
  const { switchUser, fetchCurrentUser } = useTimesheetStore();

  // On mount: try to restore session from sessionStorage
  useEffect(() => {
    restoreSession().then(() => {
      const restored = useAuthStore.getState().user;
      if (restored) {
        switchUser(restored.id);
        fetchCurrentUser();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync timesheetStore whenever the logged-in user changes
  useEffect(() => {
    if (user) fetchCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // While checking session — show spinner so we don't flash the login page
  if (isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Not logged in → show login page
  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/timesheet" replace />} />
        <Route path="timesheet" element={<TimesheetPage />} />
        <Route path="timesheets" element={<TimesheetListPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="docs" element={<DocsPage />} />
        <Route
          path="approvals"
          element={
            <ProtectedRoute allowedRoles={['TeamLead', 'Admin']}>
              <ApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="approvals/team"
          element={
            <ProtectedRoute allowedRoles={['TeamLead', 'Admin']}>
              <TeamMembersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="approvals/batch/:batchId"
          element={
            <ProtectedRoute allowedRoles={['TeamLead', 'Admin']}>
              <BatchDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="approvals/:timesheetId"
          element={
            <ProtectedRoute allowedRoles={['TeamLead', 'Admin']}>
              <TimesheetReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/batches"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminBatchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/batches/:batchId"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminBatchDetailPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
