/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // Existing components use plain CSS; disable Tailwind's base reset so it
  // doesn't restyle them. New Asset Pack / landing components use utilities.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        "k-bg": "#050505",
        "k-panel": "#0d0d0d",
        "k-card": "#141414",
      },
      transitionTimingFunction: {
        "k-ease": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
