import { useState } from 'react'

import { AuthFooter } from '../components/auth/AuthFooter'
import { AuthStatusBadge } from '../components/auth/AuthStatusBadge'
import { BrandBadge } from '../components/auth/BrandBadge'
import { RegisterForm } from '../components/auth/RegisterForm'
import { AuroraBackground } from '../components/layout/AuroraBackground'
import { useSupabaseHealth, type ConnectionState } from '../hooks/useSupabaseHealth'

export const RegisterPage = () => {
  const { status, message, refresh } = useSupabaseHealth()
  const [userMessage, setUserMessage] = useState<string | null>(null)

  const statusMessageCopy: Record<ConnectionState, string> = {
    idle: 'Chưa kiểm tra kết nối Supabase.',
    connecting: 'Đang kiểm tra kết nối Supabase...',
    connected: 'Supabase sẵn sàng. Hãy tạo tài khoản để bắt đầu.',
    error: 'Không thể kết nối Supabase.',
  }

  const displayMessage = userMessage ?? message ?? statusMessageCopy[status]

  return (
    <AuroraBackground>
      <div className="space-y-8">
        <div className="flex justify-center">
          <AuthStatusBadge status={status} />
        </div>

        <BrandBadge />

        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg sm:text-4xl">
            Tạo tài khoản BoFin
          </h1>
          {displayMessage && <p className="text-sm text-slate-200/80">{displayMessage}</p>}
        </div>

        <RegisterForm
          onSuccess={(email) => {
            setUserMessage(`Đăng ký thành công cho ${email}. Kiểm tra email để xác thực.`)
            void refresh()
          }}
          onError={(errorMessage) => {
            setUserMessage(errorMessage)
          }}
        />

        <AuthFooter prompt="Đã có tài khoản?" linkTo="/login" linkLabel="Đăng nhập ngay" />
      </div>
    </AuroraBackground>
  )
}

export default RegisterPage

