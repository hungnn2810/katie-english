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
      },
    },
  },
  plugins: [],
};
