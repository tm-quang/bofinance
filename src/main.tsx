import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initNativeAppBehavior, setupInstallPrompt, addHapticFeedback, optimizePerformance } from './utils/nativeAppBehavior'

// Initialize native app behaviors
initNativeAppBehavior()
setupInstallPrompt()
addHapticFeedback()
optimizePerformance()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
