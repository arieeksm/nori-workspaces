/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm-neutral palette (Notion-style light mode)
        paper: '#FBFBFA', // page background
        sunken: '#F3F3F1', // subtle warm-gray surface
        ink: '#1F1F1F', // primary text and primary action
        mute: '#6B6B6B', // secondary text
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
