/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sage: {
          50:  '#f4f7f4',
          100: '#e4ede3',
          200: '#c9dbc8',
          300: '#a0c09e',
          400: '#74a072',
          500: '#508650',
          600: '#3d6b3d',
          700: '#325432',
          800: '#29442b',
          900: '#223824',
        },
        cream: '#faf8f3',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
