import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../ui/layout/AppLayout'
import LandingPage from '../ui/pages/LandingPage'
import DashboardPage from '../ui/pages/DashboardPage'
import TransparencyPage from '../ui/pages/TransparencyPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="transparency" element={<TransparencyPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
