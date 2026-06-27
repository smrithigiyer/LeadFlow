/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
      extend: {
      colors: {
        /* Semantic palette */
        primary: '#5C1B1B',
        secondary: '#F5F2ED',
        tertiary: '#E8E2D9',
        neutral: '#1A1614',

        /* Back-compat: existing code uses brand-* */
        brand: {
          50:  '#F5F2ED',
          100: '#E8E2D9',
          200: '#E8E2D9',
          300: '#E8E2D9',
          400: '#E8E2D9',
          500: '#E8E2D9',
          600: '#5C1B1B',
          700: '#5C1B1B',
          800: '#1A1614',
          900: '#1A1614',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
}

{/* bg-gradient-to-r from-emerald-600 to-teal-600 */}
