/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bfd3fe',
          300: '#93b4fd',
          400: '#608dfa',
          500: '#3b68f6',
          600: '#2549eb',
          700: '#1d37d8',
          800: '#1e2faf',
          900: '#1e2d8a',
        },
      },
    },
  },
  plugins: [],
};
