/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#E63946",
          dark: "#C1121F",
          light: "#F8AD9D",
        },
      },
    },
  },
  plugins: [],
};
