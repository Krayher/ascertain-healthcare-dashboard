import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BLOOD_TYPES } from "@/features/patients/schema";
import { cn } from "@/lib/cn";

type Status = "" | "active" | "follow_up" | "inactive";

const STATUS_PILLS: { value: Status; label: string }[] = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "follow_up", label: "Follow-up" },
  { value: "inactive", label: "Inactive" },
];

export type Filters = {
  search: string;
  status: Status;
  bloodType: string;
  condition: string;
  ageMin: string;
  ageMax: string;
};

type Props = {
  value: Filters;
  onChange: (next: Filters) => void;
};

export function FilterRow({ value, onChange }: Props) {
  const [draftSearch, setDraftSearch] = useState(value.search);
  const [draftCondition, setDraftCondition] = useState(value.condition);
  const [advancedOpen, setAdvancedOpen] = useState(
    !!(value.bloodType || value.condition || value.ageMin || value.ageMax),
  );

  useEffect(() => setDraftSearch(value.search), [value.search]);
  useEffect(() => setDraftCondition(value.condition), [value.condition]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (draftSearch !== value.search || draftCondition !== value.condition) {
        onChange({ ...value, search: draftSearch, condition: draftCondition });
      }
    }, 250);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSearch, draftCondition]);

  function patch(next: Partial<Filters>) {
    onChange({ ...value, ...next });
  }

  return (
    <div className="mb-4 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <Input
          className="max-w-[360px] flex-1"
          placeholder="Filter by name, MRN…"
          value={draftSearch}
          onChange={(e) => setDraftSearch(e.target.value)}
          aria-label="Search patients"
        />
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className={cn(
            "rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors",
            advancedOpen
              ? "border-transparent bg-accent-bg text-accent-fg"
              : "border-border bg-bg-subtle text-fg-muted hover:bg-bg-elev",
          )}
          aria-expanded={advancedOpen}
          aria-controls="advanced-filters"
        >
          {advancedOpen ? "− Advanced" : "+ Advanced"}
        </button>
        <div className="ml-auto flex gap-1.5">
          {STATUS_PILLS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => patch({ status: p.value })}
              className={cn(
                "rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors",
                value.status === p.value
                  ? "border-transparent bg-accent-bg text-accent-fg"
                  : "border-border bg-bg-subtle text-fg-muted hover:bg-bg-elev",
              )}
              aria-pressed={value.status === p.value}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {advancedOpen && (
        <div
          id="advanced-filters"
          className="grid grid-cols-2 gap-2.5 rounded-md border border-dashed border-border bg-bg-subtle/40 p-3 md:grid-cols-4"
        >
          <label className="block">
            <span className="mb-1 block text-[11.5px] text-fg-muted">
              Blood type
            </span>
            <Select
              value={value.bloodType}
              onChange={(e) => patch({ bloodType: e.target.value })}
              aria-label="Filter by blood type"
            >
              <option value="">Any</option>
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] text-fg-muted">
              Condition contains
            </span>
            <Input
              value={draftCondition}
              onChange={(e) => setDraftCondition(e.target.value)}
              placeholder="hypertension"
              aria-label="Filter by condition substring"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] text-fg-muted">
              Age min
            </span>
            <Input
              type="number"
              min={0}
              max={150}
              value={value.ageMin}
              onChange={(e) => patch({ ageMin: e.target.value })}
              aria-label="Minimum age"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] text-fg-muted">
              Age max
            </span>
            <Input
              type="number"
              min={0}
              max={150}
              value={value.ageMax}
              onChange={(e) => patch({ ageMax: e.target.value })}
              aria-label="Maximum age"
            />
          </label>
        </div>
      )}
    </div>
  );
}
