import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight } from "lucide-react";
import { useRef } from "react";

import { StatusPill } from "@/features/patients/components/StatusPill";
import type { Patient } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { formatDate, initials } from "@/lib/format";

type Props = {
  rows: Patient[];
  onRowClick: (id: string) => void;
};

const ROW_HEIGHT = 64;

export function PatientTableVirtual({ rows, onRowClick }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  return (
    <div className="overflow-hidden">
      <div className="grid grid-cols-[36%_8%_18%_22%_12%_4%] bg-bg-subtle px-3.5 py-3 text-[11.5px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
        <span>Patient</span>
        <span>Age</span>
        <span>Last visit</span>
        <span>Conditions</span>
        <span>Status</span>
        <span />
      </div>
      <div
        ref={parentRef}
        className="max-h-[640px] overflow-auto"
        role="rowgroup"
      >
        <div
          style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((virt) => {
            const p = rows[virt.index];
            return (
              <div
                key={p.id}
                onClick={() => onRowClick(p.id)}
                role="row"
                className={cn(
                  "absolute inset-x-0 grid cursor-pointer grid-cols-[36%_8%_18%_22%_12%_4%] items-center border-b border-border px-3.5 hover:bg-bg-subtle",
                )}
                style={{
                  transform: `translateY(${virt.start}px)`,
                  height: ROW_HEIGHT,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-accent-bg text-[12px] font-semibold text-accent-fg">
                    {initials(p.first_name, p.last_name)}
                  </div>
                  <div>
                    <div className="text-[13.5px] font-medium text-fg">
                      {p.first_name} {p.last_name}
                    </div>
                    <div className="font-mono text-[11px] text-fg-subtle">
                      {p.mrn} · {p.blood_type}
                    </div>
                  </div>
                </div>
                <div className="text-[13.5px]">{p.age}</div>
                <div className="font-mono text-[12px] text-fg-muted">
                  {p.last_visit_at ? formatDate(p.last_visit_at) : "—"}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(p.conditions ?? []).slice(0, 2).map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-[11px] text-fg-muted"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <div>
                  <StatusPill status={p.status} />
                </div>
                <div className="text-right text-fg-subtle">
                  <ChevronRight className="ml-auto h-4 w-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
