/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', '../../packages/delivery-wizard/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#16B24B',
          foreground: '#ffffff',
        },
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
