import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";

type State = {
  theme: Theme;
  toggle: () => void;
  set: (theme: Theme) => void;
};

const systemPrefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export const useTheme = create<State>()(
  persist(
    (set, get) => ({
      theme: systemPrefersDark() ? "dark" : "light",
      toggle: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      set: (theme) => set({ theme }),
    }),
    { name: "ascertain-theme" },
  ),
);

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}
