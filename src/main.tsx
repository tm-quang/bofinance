import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initNativeAppBehavior, setupInstallPrompt, optimizePerformance } from './utils/nativeAppBehavior'
import { setupConsoleOverride } from './utils/consoleOverride'
import { registerServiceWorker } from './lib/serviceWorkerManager'
import './utils/checkCloudinaryConfig' // Auto-check Cloudinary config in dev mode

// Override console to prevent sensitive data leaks
setupConsoleOverride()

// Initialize native app behaviors
initNativeAppBehavior()
setupInstallPrompt()
// addHapticFeedback() - Disabled: Removed haptic feedback/vibration
optimizePerformance()

// Register service worker for PWA background notifications
if ('serviceWorker' in navigator) {
  registerServiceWorker().catch((error) => {
    console.error('Failed to register service worker:', error)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
