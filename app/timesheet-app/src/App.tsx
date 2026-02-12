import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import TimesheetPage from './pages/timesheet/TimesheetPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import ProjectsPage from './pages/admin/ProjectsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/timesheet" replace />} />
        <Route path="timesheet" element={<TimesheetPage />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="admin/projects" element={<ProjectsPage />} />
      </Route>
    </Routes>
  )
}

export default App
