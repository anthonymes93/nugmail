/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'g-blue': '#1a73e8',
        'g-bg': '#f6f8fc',
        'g-hover': '#e8f0fe',
        'g-selected': '#d3e3fd',
      },
    },
  },
  plugins: [],
}

