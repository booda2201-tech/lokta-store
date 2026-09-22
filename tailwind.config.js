/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        ink: '#25231f',
        cream: '#f8f5ef',
        coral: '#f0785f',
        sky: '#cfe8e3',
        butter: '#f6cf71',
        berry: '#8e5264'
      },
      fontFamily: {
        display: ['"Cairo"', 'sans-serif'],
        sans: ['"Cairo"', 'sans-serif']
      },
      boxShadow: {
        soft: '0 18px 50px rgba(37, 35, 31, 0.09)'
      }
    }
  },
  plugins: []
};
