/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4F9DFF',
        secondary: '#6ED6C1',
        accent: '#FFD166',
        highlight: '#FF7B7B',
        'brand-purple': '#A78BFA',
        'brand-pink': '#FF9BD2',
        'brand-orange': '#FFB26B',
        'brand-green': '#7BD88F',
        background: '#F7F9FC',
        card: '#FFFFFF',
        border: '#E2E8F0',
        textPrimary: '#0F172A',
        textSecondary: '#64748B',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15,23,42,0.06), 0 1px 2px -1px rgba(15,23,42,0.04)',
        'card-hover': '0 8px 24px -4px rgba(15,23,42,0.10), 0 2px 8px -2px rgba(15,23,42,0.06)',
        sidebar: '1px 0 0 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.18s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        shake: 'shake 0.4s ease-in-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%':      { transform: 'translateX(-8px)' },
          '40%':      { transform: 'translateX(8px)' },
          '60%':      { transform: 'translateX(-6px)' },
          '80%':      { transform: 'translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
};
