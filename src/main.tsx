import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initNativeAppBehavior, setupInstallPrompt, optimizePerformance } from './utils/nativeAppBehavior'
import { setupConsoleOverride } from './utils/consoleOverride'
import { registerServiceWorker } from './lib/serviceWorkerManager'
import './utils/checkCloudinaryConfig' // Auto-check Cloudinary config in dev mode

// Declare global window.onQRCodeScanned function
declare global {
  interface Window {
    onQRCodeScanned?: (scanResult: string) => void
  }
}

// Setup global QR code scanned callback
// This function can be called from external systems (native apps, other QR scanners, etc.)
// Android app có thể gọi hàm này trực tiếp sau khi scan QR thành công
window.onQRCodeScanned = function(scanResult: string) {
  console.log('onQRCodeScanned called with result:', scanResult)
  
  // Để kiểm tra, hãy dùng alert trước
  alert("Đã nhận được mã QR: " + scanResult)

  // Tự động điều hướng đến trang QR Result với kết quả quét
  if (scanResult && scanResult.trim()) {
    // Encode scanResult để tránh lỗi với các ký tự đặc biệt trong URL
    const encodedResult = encodeURIComponent(scanResult.trim())
    // Điều hướng đến trang QR Result
    window.location.href = `/qr-result?result=${encodedResult}`
  }
}

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
