import { useState, type ChangeEvent, type FormEvent } from 'react'
import { FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi'

import { getSupabaseClient } from '../../lib/supabaseClient'

type LoginFormProps = {
  onSuccess?: (email: string) => void
  onError?: (message: string) => void
}

export const LoginForm = ({ onSuccess, onError }: LoginFormProps) => {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange =
    (field: 'email' | 'password') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }))
      if (error) {
        setError('')
      }
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const supabase = getSupabaseClient()

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (authError) {
        throw authError
      }

      onSuccess?.(formData.email)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin và thử lại.'
      setError(message)
      onError?.(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-3xl shadow-lg bg-white p-6 sm:p-8">
      {error && (
        <div className="mb-5 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <FiMail className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="block w-full rounded-3xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Email / Số điện thoại"
              value={formData.email}
              onChange={handleChange('email')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <FiLock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className="block w-full rounded-3xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Mật khẩu"
              value={formData.password}
              onChange={handleChange('password')}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors hover:text-slate-600"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="text-right">
          <button
            className="text-sm font-medium text-sky-600 transition-colors hover:text-sky-500"
            type="button"
          >
            Quên mật khẩu?
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full transform rounded-3xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-lg transition duration-200 hover:scale-[1.02] hover:shadow-xl hover:from-sky-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  )
}

