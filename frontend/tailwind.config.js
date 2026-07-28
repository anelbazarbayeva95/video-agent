/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // Existing components use plain CSS; disable Tailwind's base reset so it
  // doesn't restyle them. New Asset Pack / landing components use utilities.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // Light theme. Semantic roles: ink = canvas (white) & text-on-accent;
        // bone = body text / borders (dark); ember = primary accent (near-black
        // CTAs); electric = the single signature colour, reserved for ranking.
        ink: "#FFFFFF",       // canvas / text on dark accents
        ash: "#F4F4F5",       // cards / panels
        bone: "#1C1C1F",      // body text & borders (dark)
        ember: "#111114",     // primary accent — near-black CTAs
        electric: "#2E6BFF",  // signature — ranking
        muted: "#71717A",     // secondary text
        // legacy aliases
        "k-bg": "#FFFFFF",
        "k-panel": "#F4F4F5",
        "k-card": "#F4F4F5",
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
