import { LayoutGrid, Rows3 } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  type PatientViewMode,
  usePatientViewMode,
} from "@/features/patients/view-mode";

const OPTIONS: { value: PatientViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "table", label: "Table", icon: Rows3 },
  { value: "cards", label: "Cards", icon: LayoutGrid },
];

export function ViewModeToggle() {
  const mode = usePatientViewMode((s) => s.mode);
  const setMode = usePatientViewMode((s) => s.set);

  return (
    <div
      role="radiogroup"
      aria-label="Patient view mode"
      className="inline-flex items-center rounded-md border border-border bg-bg-subtle p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${label} view`}
            onClick={() => setMode(value)}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] transition-colors",
              selected
                ? "bg-bg-elev text-fg shadow-sm"
                : "text-fg-muted hover:text-fg",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
