/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // Existing components use plain CSS; disable Tailwind's base reset so it
  // doesn't restyle them. New Asset Pack / landing components use utilities.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // Cinematic mono palette. Accent is white (CTAs); electric blue is the
        // single signature colour, reserved for the ranking (logo, #1 badge,
        // metric bars, selected ring).
        ink: "#090909",       // canvas
        ash: "#111111",       // cards / panels
        bone: "#EDEDED",      // body text (cool near-white)
        ember: "#FFFFFF",     // primary accent — kept name to avoid churn
        electric: "#3D7BFF",  // signature — ranking
        muted: "#A1A1AA",     // secondary text
        // legacy aliases
        "k-bg": "#090909",
        "k-panel": "#111111",
        "k-card": "#111111",
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
