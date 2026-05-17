import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PatientViewMode = "table" | "cards";

type State = {
  mode: PatientViewMode;
  set: (mode: PatientViewMode) => void;
};

export const usePatientViewMode = create<State>()(
  persist(
    (set) => ({
      mode: "table",
      set: (mode) => set({ mode }),
    }),
    { name: "ascertain-patient-view" },
  ),
);
