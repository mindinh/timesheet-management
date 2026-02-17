import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '@/shared/layouts/MainLayout'
import TimesheetPage from '@/features/timesheet/pages/TimesheetPage'
import TimesheetListPage from '@/features/timesheet/pages/TimesheetListPage'
import ApprovalsPage from '@/features/approvals/pages/ApprovalsPage'
import TimesheetReviewPage from '@/features/approvals/pages/TimesheetReviewPage'
import AdminDashboard from '@/features/admin/pages/AdminDashboard'
import ProjectsPage from '@/features/projects/pages/ProjectsPage'
import ProtectedRoute from '@/shared/components/common/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/timesheet" replace />} />
        <Route path="timesheet" element={<TimesheetPage />} />
        <Route path="timesheets" element={<TimesheetListPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="approvals" element={
          <ProtectedRoute allowedRoles={['TeamLead', 'Admin']}>
            <ApprovalsPage />
          </ProtectedRoute>
        } />
        <Route path="approvals/:timesheetId" element={
          <ProtectedRoute allowedRoles={['TeamLead', 'Admin']}>
            <TimesheetReviewPage />
          </ProtectedRoute>
        } />
        <Route path="admin" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  )
}

export default App

