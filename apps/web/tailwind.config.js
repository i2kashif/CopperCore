/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        copper: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#d9c2b6',
          400: '#c9a892',
          500: '#b87333', // Main copper color
          600: '#a05d2c',
          700: '#874a24',
          800: '#6f3a1d',
          900: '#5a2e18',
        },
        primary: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#d9c2b6',
          400: '#c9a892',
          500: '#b87333',
          600: '#a05d2c',
          700: '#874a24',
          800: '#6f3a1d',
          900: '#5a2e18',
        }
      }
    },
  },
  plugins: [],
}