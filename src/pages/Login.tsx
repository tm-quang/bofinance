import { useNavigate } from 'react-router-dom'

import { AuthFooter } from '../components/auth/AuthFooter'
import { BrandBadge } from '../components/auth/BrandBadge'
import { LoginForm } from '../components/auth/LoginForm'
import { SocialLoginButtons } from '../components/auth/SocialLoginButtons'
import { AuroraBackground } from '../components/layout/AuroraBackground'
import { useSupabaseHealth } from '../hooks/useSupabaseHealth'

export const LoginPage = () => {
  const { refresh } = useSupabaseHealth()
  const navigate = useNavigate()

  return (
    <AuroraBackground>
      <div className="flex min-h-full w-full flex-col items-center justify-between gap-3">
        <div className="flex w-full flex-shrink-0 flex-col items-center gap-2 sm:gap-3 pt-6 sm:pt-8">
          <BrandBadge />

          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-800 drop-shadow-sm sm:text-2xl md:text-3xl">Chào mừng trở lại!</h1>
          </div>
        </div>

        <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 py-4">
          <LoginForm
            onSuccess={() => {
              void refresh()
              navigate('/dashboard', { replace: true })
            }}
            onError={() => {
              // Error handling is done in LoginForm component
            }}
          />

          <SocialLoginButtons />
        </div>

        <div className="flex w-full flex-shrink-0 items-center justify-center pb-4">
          <AuthFooter prompt="Chưa có tài khoản?" linkTo="/register" linkLabel="Đăng ký ngay" />
        </div>
      </div>
    </AuroraBackground>
  )
}

export default LoginPage

