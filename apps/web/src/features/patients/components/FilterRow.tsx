import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type Status = "" | "active" | "follow_up" | "inactive";

const PILLS: { value: Status; label: string }[] = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "follow_up", label: "Follow-up" },
  { value: "inactive", label: "Inactive" },
];

type Props = {
  search: string;
  status: Status;
  onChange: (next: { search: string; status: Status }) => void;
};

export function FilterRow({ search, status, onChange }: Props) {
  const [draft, setDraft] = useState(search);

  useEffect(() => {
    setDraft(search);
  }, [search]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (draft !== search) onChange({ search: draft, status });
    }, 250);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <Input
        className="max-w-[360px] flex-1"
        placeholder="Filter by name, MRN, or condition…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label="Search patients"
      />
      <div className="ml-auto flex gap-1.5">
        {PILLS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange({ search: draft, status: p.value })}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors",
              status === p.value
                ? "border-transparent bg-accent-bg text-accent-fg"
                : "border-border bg-bg-subtle text-fg-muted hover:bg-bg-elev",
            )}
            aria-pressed={status === p.value}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
