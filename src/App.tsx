import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import DashboardPage from './pages/Dashboard'
import CategoriesPage from './pages/Categories'
import ReportsPage from './pages/Reports'
import SettingsPage from './pages/Settings'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

