/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: '#ffd392',
        secondary: '#e6bc8a',
        tertiary: '#aa9d8e'
      }
    }
  },
  plugins: ['prettier-plugin-tailwindcss']
};
