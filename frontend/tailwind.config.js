/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Google Sans', 'system-ui', 'sans-serif'],
        'sans-text': ['Google Sans Text', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};