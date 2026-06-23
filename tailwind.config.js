// /** @type {import('tailwindcss').Config} */
// export default {
//   content: [
//     "./index.html",
//     "./src/**/*.{js,ts,jsx,tsx}",
//   ],
//   theme: {
//     extend: {},
//   },
//   plugins: [],
// }
/** @type {import('tailwindcss').Config} */

export default {

  darkMode: 'class',

  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],

  theme: {

    extend: {

      keyframes: {

        'slide-down': {

          from: { transform: 'translateY(-100%)', opacity: '0' },

          to: { transform: 'translateY(0)', opacity: '1' },

        },

        'slide-in-right': {

          from: { transform: 'translateX(100%)' },

          to: { transform: 'translateX(0)' },

        },

      },

      animation: {

        'slide-down': 'slide-down 0.4s cubic-bezier(0.16,1,0.3,1)',

        'slide-in-right': 'slide-in-right 0.35s cubic-bezier(0.16,1,0.3,1)',

      },

    },

  },

  plugins: [],

};
