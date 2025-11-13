export const BrandBadge = () => (
  <div className="relative flex justify-center">
    <div className="relative">
      <div className="flex h-24 w-24 -rotate-3 items-center justify-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-blue-500 via-green-400 via-yellow-300 via-orange-400 to-pink-500 shadow-2xl transition-transform duration-300 hover:rotate-0 sm:h-28 sm:w-28 sm:rounded-[2rem]">
        <div className="absolute inset-0 bg-gradient-to-br from-white/25 to-transparent" />
        <span className="relative z-10 text-5xl font-bold text-white drop-shadow-lg sm:text-6xl">$</span>
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine" />
      </div>
      <div className="absolute -top-2 -right-2 h-3.5 w-3.5 rounded-full bg-yellow-300 shadow-lg animate-pulse sm:h-4 sm:w-4" />
      <div className="absolute -bottom-2 -left-2 h-3 w-3 rounded-full bg-pink-400 shadow-lg animate-pulse animation-delay-150 sm:h-3.5 sm:w-3.5" />
    </div>
  </div>
)

