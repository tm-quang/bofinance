import { AuthFooter } from '../components/auth/AuthFooter'
import { BrandBadge } from '../components/auth/BrandBadge'
import { RegisterForm } from '../components/auth/RegisterForm'
import { AuroraBackground } from '../components/layout/AuroraBackground'
import { useSupabaseHealth } from '../hooks/useSupabaseHealth'

export const RegisterPage = () => {
  const { refresh } = useSupabaseHealth()

  return (
    <AuroraBackground>
      <div className="flex h-full w-full flex-col items-center justify-between gap-2 py-8 sm:gap-3 sm:py-4">
        <div className="flex w-full flex-shrink-0 flex-col items-center gap-2 sm:gap-3">
          <BrandBadge />

          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-800 drop-shadow-sm sm:text-2xl md:text-3xl">
              Tạo tài khoản BoFin
            </h1>
          </div>
        </div>

        <div className="flex w-full flex-1 flex-col items-center justify-center gap-2 overflow-y-auto sm:gap-3">
          <RegisterForm
            onSuccess={() => {
              void refresh()
            }}
            onError={() => {
              // Error handling is done in RegisterForm component
            }}
          />
        </div>

        <div className="flex w-full flex-shrink-0 items-center justify-center">
          <AuthFooter prompt="Đã có tài khoản?" linkTo="/login" linkLabel="Đăng nhập ngay" />
        </div>
      </div>
    </AuroraBackground>
  )
}

export default RegisterPage

