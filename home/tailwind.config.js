/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        accent: '#F97316',
        deep: '#0F172A',
        grayText: '#334155',
        background: '#F8FAFC'
      },
      fontFamily: {
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};