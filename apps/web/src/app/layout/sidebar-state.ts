import { create } from "zustand";

type State = {
  open: boolean;
  set: (open: boolean) => void;
  toggle: () => void;
};

// In-memory only (intentionally not persisted). Controls the mobile
// sidebar drawer; on md+ screens the sidebar is always visible and this
// state is ignored.
export const useSidebar = create<State>((set, get) => ({
  open: false,
  set: (open) => set({ open }),
  toggle: () => set({ open: !get().open }),
}));
