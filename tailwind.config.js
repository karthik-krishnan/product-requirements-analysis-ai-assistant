/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a5bcfd',
          400: '#8198fb',
          500: '#6272f5',
          600: '#4f55e8',
          700: '#4244cd',
          800: '#3637a5',
          900: '#303482',
        },
      },
    },
  },
  plugins: [],
}
