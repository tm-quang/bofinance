/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        lobster: ['Lobster', 'cursive'],
      },
      animation: {
        'gradient-xy': 'gradient-xy 20s ease infinite',
        blob: 'blob 7s infinite',
        shine: 'shine 1.8s linear infinite',
        shimmer: 'shimmer 2s infinite',
        zoom: 'zoom 0.6s ease-in-out infinite',
        'zoom-text': 'zoom-text 0.6s ease-in-out infinite',
        'zoom-once': 'zoom 0.6s ease-in-out',
        'zoom-text-once': 'zoom-text 0.6s ease-in-out',
      },
      keyframes: {
        'gradient-xy': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
        },
        shine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        zoom: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
        'zoom-text': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
        },
      },
    },
  },
  plugins: [],
}

