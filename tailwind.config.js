/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        nawiy: {
          green:  '#1D9E75',
          dark:   '#1A3C34',
          light:  '#E8F7F2',
        }
      }
    },
  },
  plugins: [],
}

