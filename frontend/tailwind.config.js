/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF9F6',
        panel: '#F1EFE9',
        ink: '#21262F',
        inkSoft: '#565F6E',
        accent: '#2F5D8A',
        accentSoft: '#E4ECF3',
        highlight: '#FFD666',
        good: '#6B8F71',
        bad: '#C1543C',
        line: '#E4E1D8',
      },
      fontFamily: {
        serif: ['"Literata"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        read: '680px',
      },
    },
  },
  plugins: [],
}
