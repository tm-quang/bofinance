import type { PropsWithChildren } from 'react'

export const AuroraBackground = ({ children }: PropsWithChildren) => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 md:px-10">
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 via-cyan-800 via-blue-900 to-indigo-900 animate-gradient-xy" />

    <div className="absolute inset-0 opacity-30">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 800" preserveAspectRatio="none">
        <path
          d="M0,400 Q300,200 600,400 T1200,400 L1200,800 L0,800 Z"
          fill="url(#aurora-gradient-1)"
          opacity="0.4"
        />
        <path
          d="M0,500 Q400,300 800,500 T1200,500 L1200,800 L0,800 Z"
          fill="url(#aurora-gradient-2)"
          opacity="0.3"
        />
        <path
          d="M0,600 Q500,400 1000,600 T1200,600 L1200,800 L0,800 Z"
          fill="url(#aurora-gradient-3)"
          opacity="0.2"
        />
        <defs>
          <linearGradient id="aurora-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="aurora-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="aurora-gradient-3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>
    </div>

    <div className="absolute top-0 left-1/4 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500 mix-blend-multiply blur-3xl opacity-20 animate-blob md:h-96 md:w-96" />
    <div className="absolute top-0 right-1/4 h-80 w-80 translate-x-1/2 rounded-full bg-cyan-500 mix-blend-multiply blur-3xl opacity-20 animate-blob animation-delay-2000 md:h-96 md:w-96" />
    <div className="absolute -bottom-10 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-600 mix-blend-multiply blur-3xl opacity-20 animate-blob animation-delay-4000 md:h-96 md:w-96" />

    <div className="relative z-10 w-full max-w-md">{children}</div>
  </div>
)

