/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: {
            DEFAULT: '#2E8B3F',
            50: '#EFF7F0',
            100: '#D7EBDA',
            200: '#B0D7B6',
            300: '#82BC8D',
            400: '#4FA85F',
            500: '#2E8B3F',
            600: '#246B30',
            700: '#1B5224',
            800: '#143A17',
            900: '#0E2A11',
          },
          orange: {
            DEFAULT: '#F5A623',
            50: '#FEF5E7',
            100: '#FDE8C2',
            200: '#FBD58A',
            300: '#F9C252',
            400: '#F7B236',
            500: '#F5A623',
            600: '#E0911A',
            700: '#B87314',
            800: '#925812',
            900: '#754712',
          },
        },
      },
    },
  },
  plugins: [],
};