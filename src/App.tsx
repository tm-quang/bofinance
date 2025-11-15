import { useEffect, Suspense, lazy, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useSwipeBack } from './hooks/useSwipeBack'
import { NotificationProvider } from './contexts/NotificationContext'
import { DialogProvider } from './contexts/DialogContext'
import ToastStackLimiter from './components/ui/ToastStackLimiter'
import { isInstalledPWA } from './utils/nativeAppBehavior'

const DashboardPage = lazy(() => import('./pages/Dashboard'))
const CategoriesPage = lazy(() => import('./pages/Categories'))
const ReportsPage = lazy(() => import('./pages/Reports'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const WalletsPage = lazy(() => import('./pages/Wallets'))
const TransactionsPage = lazy(() => import('./pages/Transactions'))
const BudgetsPage = lazy(() => import('./pages/Budgets'))
const RemindersPage = lazy(() => import('./pages/Reminders'))
const LoginPage = lazy(() => import('./pages/Login'))
const RegisterPage = lazy(() => import('./pages/Register'))

const PageFallback = () => (
  <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6">
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <div className="relative h-32 w-32">
        <div className="absolute -inset-6 rounded-full bg-sky-200/30 blur-[40px]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute h-40 w-40 rounded-full border border-sky-200/80 ripple-wave" />
          <div className="absolute h-48 w-48 rounded-full border border-sky-100/70 ripple-wave-delay-1" />
          <div className="absolute h-56 w-56 rounded-full border border-sky-50/60 ripple-wave-delay-2" />
        </div>
        <div className="absolute inset-0 rounded-full bg-sky-200/40 blur-xl animate-waveGlow" />
        <div
          className="absolute inset-2 rounded-full bg-sky-100/30 blur-xl animate-waveGlow"
          style={{ animationDelay: '0.3s' }}
        />
        <img
          src="/bogin-logo.png"
          alt="BO.fin logo"
          className="relative h-32 w-32 animate-[scalePulse_3s_ease-in-out_infinite]"
        />
      </div>
      <div className="flex items-center gap-3">
        {[0, 1, 2, 3, 4].map((dot) => (
          <span
            key={dot}
            className="h-3 w-3 rounded-full bg-gradient-to-r from-sky-400 to-blue-500"
            style={{
              animation: `dotPulse 1.2s ease-in-out ${dot * 0.12}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  </div>
)

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const [initialPath] = useState(() => location.pathname)
  const splashEligible = ['/login', '/register', '/'].includes(initialPath)
  const [showSplash, setShowSplash] = useState(splashEligible)
  
  // Enable swipe back gesture (swipe from left edge to go back)
  useSwipeBack({ enabled: true, threshold: 100, edgeWidth: 50 })

  // Enhanced Android back button handling for PWA
  useEffect(() => {
    if (!isInstalledPWA()) return

    // React Router's BrowserRouter automatically handles back button
    // We just need to ensure proper behavior for PWA
    
    // Track navigation history for back button
    const unlisten = () => {
      // React Router handles this automatically
    }

    return unlisten
  }, [location.pathname, navigate])

  useEffect(() => {
    if (!splashEligible) return
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [splashEligible])

  return (
    <>
      {showSplash ? (
        <PageFallback />
      ) : (
        <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/wallets" element={<WalletsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/reminders" element={<RemindersPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
        </Suspense>
      )}
      <Toaster
        position="top-center"
        containerClassName="!top-4"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '12px',
            padding: '5px',
            maxWidth: '450px',
            fontSize: '13px',
            fontWeight: '500',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#ffffff',
              secondary: '#10b981',
            },
          },
          error: {
            duration: 3000,
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
        <DialogProvider>
          <AppContent />
        </DialogProvider>
      </NotificationProvider>
    </BrowserRouter>
  )
}

export default App

