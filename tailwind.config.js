/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eef2ff', 100: '#e0e7ff', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 900: '#312e81' },
        surface: { DEFAULT: '#0a0a0f', card: '#12121a', hover: '#1a1a25', input: '#0e0e16' },
        line: { DEFAULT: '#1e1e2e', focus: '#6366f1' },
        muted: '#6b6b80',
        dim: '#44445a',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
