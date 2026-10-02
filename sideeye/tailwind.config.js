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
        // Alias scale: components use `brand-red` classes (bg-brand-red,
        // text-brand-red-dark, outline-brand-red, …) matching the
        // --brand-red CSS vars in app/globals.css. Without this Tailwind
        // emits nothing for those classes — e.g. the Log in button rendered
        // white text on a transparent background.
        "brand-red": {
          DEFAULT: "#E63946",
          dark: "#C1121F",
          light: "#F8AD9D",
        },
        surface: "#FFF7F7",
        "border-brand": "#F0D5D7",
        gold: "#D4AF37",
      },
      fontFamily: {
        display: ["ui-serif", "Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};
