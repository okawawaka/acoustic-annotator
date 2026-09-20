/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        swiss: {
          white: "#ffffff",
          bg: "#f9f9fb",
          surface: "#ffffff",
          "surface-hover": "#f3f3f6",
          border: "#e0e0e6",
          "border-dark": "#111111",
          black: "#111111",
          gray: {
            dark: "#444448",
            medium: "#777780",
            light: "#aaaaaf",
            subtle: "#f0f0f4",
          },
          red: {
            DEFAULT: "#E30613",
            hover: "#c40510",
            light: "rgba(227, 6, 19, 0.08)",
          },
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Helvetica Neue'",
          "'Hiragino Sans'",
          "'Noto Sans JP'",
          "sans-serif",
        ],
        mono: [
          "'JetBrains Mono'",
          "'SF Mono'",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
