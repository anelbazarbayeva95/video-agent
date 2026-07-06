/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // Existing components use plain CSS; disable Tailwind's base reset so it
  // doesn't restyle them. New Asset Pack / landing components use utilities.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // Frame Noir brand tokens
        ink: "#0B0B0D",
        ash: "#151519",
        bone: "#EDE8DF",
        ember: "#D9873F",
        // legacy aliases
        "k-bg": "#0B0B0D",
        "k-panel": "#151519",
        "k-card": "#151519",
      },
      transitionTimingFunction: {
        "k-ease": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      letterSpacing: {
        brand: "0.3em",
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
