import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", "[data-theme='dark']"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ['"Instrument Serif"', "Iowan Old Style", "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        bg: "var(--bg)",
        "bg-elev": "var(--bg-elev)",
        "bg-subtle": "var(--bg-subtle)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        fg: "var(--text)",
        "fg-muted": "var(--text-muted)",
        "fg-subtle": "var(--text-subtle)",
        accent: "var(--accent)",
        "accent-bg": "var(--accent-bg)",
        "accent-fg": "var(--accent-fg)",
        danger: "var(--danger)",
        ok: "var(--ok)",
        "ok-bg": "var(--ok-bg)",
        warn: "var(--warn)",
        "warn-bg": "var(--warn-bg)",
        inactive: "var(--inactive)",
        "inactive-bg": "var(--inactive-bg)",
      },
    },
  },
} satisfies Config;
