export const SocialLoginButtons = () => (
  <div className="mt-6 flex gap-3">
    <button
      type="button"
      aria-label="Đăng nhập với Facebook"
      className="flex flex-1 transform items-center justify-center rounded-full bg-[#1877F2] px-4 py-3 text-sm font-medium text-white shadow-md transition hover:bg-[#166FE5] active:scale-[0.98]"
    >
      <svg className="h-6 w-6 rounded-full" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M22.675 0H1.325C.593 0 0 .593 0 1.326v21.348C0 23.407.593 24 1.325 24h11.495V14.708H9.691v-3.62h3.129V8.413c0-3.1 1.895-4.788 4.661-4.788 1.325 0 2.463.099 2.794.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.763v2.313h3.587l-.468 3.62h-3.12V24h6.116C23.407 24 24 23.407 24 22.674V1.326C24 .593 23.407 0 22.675 0z"
        />
      </svg>
    </button>
    <button
      type="button"
      aria-label="Đăng nhập với Google"
      className="flex flex-1 transform items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-md transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
    >
      <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    </button>
  </div>
)

