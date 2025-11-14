import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initNativeAppBehavior, setupInstallPrompt, addHapticFeedback, optimizePerformance } from './utils/nativeAppBehavior'
import { setupConsoleOverride } from './utils/consoleOverride'
import './utils/checkCloudinaryConfig' // Auto-check Cloudinary config in dev mode

// Override console to prevent sensitive data leaks
setupConsoleOverride()

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
