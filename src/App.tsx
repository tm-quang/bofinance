import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useSwipeBack } from './hooks/useSwipeBack'
import { NotificationProvider } from './contexts/NotificationContext'
import ToastStackLimiter from './components/ui/ToastStackLimiter'

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
    <>
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
      <Toaster
        position="top-center"
        containerClassName="!top-4"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: '12px',
            padding: '0',
            maxWidth: '420px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            duration: 3500,
            iconTheme: {
              primary: '#ffffff',
              secondary: '#10b981',
            },
          },
          error: {
            duration: 3500,
            iconTheme: {
              primary: '#ffffff',
              secondary: '#ef4444',
            },
          },
          loading: {
            duration: Infinity,
            iconTheme: {
              primary: '#ffffff',
              secondary: '#3b82f6',
            },
          },
        }}
      />
      <ToastStackLimiter />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </BrowserRouter>
  )
}

export default App

