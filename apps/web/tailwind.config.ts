import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", "[data-theme='dark']"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
        // Headlines previously used Instrument Serif (decorative, hard to read).
        // Mapped to the same Inter stack so existing `font-serif` callsites read
        // cleanly without touching every component.
        serif: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
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
