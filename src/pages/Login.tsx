import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AuthFooter } from '../components/auth/AuthFooter'
import { BrandBadge } from '../components/auth/BrandBadge'
import { LoginForm } from '../components/auth/LoginForm'
import { SocialLoginButtons } from '../components/auth/SocialLoginButtons'
import { AuroraBackground } from '../components/layout/AuroraBackground'
import { useSupabaseHealth, type ConnectionState } from '../hooks/useSupabaseHealth'

export const LoginPage = () => {
  const { status, message, refresh } = useSupabaseHealth()
  const [userMessage, setUserMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  const statusMessageCopy: Record<ConnectionState, string> = {
    idle: 'Chưa kiểm tra kết nối Supabase.',
    connecting: 'Đang kiểm tra kết nối Supabase...',
    connected: 'Mọi thứ đã sẵn sàng chờ bạn khám phá',
    error: 'Không thể kết nối Supabase.',
  }

  const displayMessage = userMessage ?? message ?? statusMessageCopy[status]

  return (
    <AuroraBackground>
      <div className="space-y-4">

        <BrandBadge />

        <div className="space-y-3 text-center">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg sm:text-4xl">Chào mừng trở lại!</h1>
          {displayMessage && <p className="text-sm text-slate-200/80">{displayMessage}</p>}
        </div>

        <LoginForm
          onSuccess={(email) => {
            setUserMessage(`Đăng nhập thành công cho ${email}`)
            void refresh()
            navigate('/dashboard', { replace: true })
          }}
          onError={(errorMessage) => {
            setUserMessage(errorMessage)
          }}
        />

        <SocialLoginButtons />

        <AuthFooter prompt="Chưa có tài khoản?" linkTo="/register" linkLabel="Đăng ký ngay" />
      </div>
    </AuroraBackground>
  )
}

export default LoginPage

