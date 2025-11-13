import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useSwipeBack } from './hooks/useSwipeBack'

import DashboardPage from './pages/Dashboard'
import CategoriesPage from './pages/Categories'
import ReportsPage from './pages/Reports'
import SettingsPage from './pages/Settings'
import WalletsPage from './pages/Wallets'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'

function AppContent() {
  // Enable swipe back gesture (swipe from left edge to go back)
  useSwipeBack({ enabled: true, threshold: 100, edgeWidth: 50 })

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/wallets" element={<WalletsPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App

