import { ChevronRight } from "lucide-react";

import { StatusPill } from "@/features/patients/components/StatusPill";
import type { Patient } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { formatDate, initials } from "@/lib/format";

type SortField = "last_visit" | "name" | "created_at";

type Props = {
  rows: Patient[];
  onRowClick: (id: string) => void;
  sort?: SortField;
  order?: "asc" | "desc";
  onSortChange?: (sort: SortField) => void;
};

const HEAD = "px-3.5 py-3 text-left font-medium uppercase tracking-[0.08em] text-[11.5px] text-fg-subtle";
const TD = "px-3.5 py-3.5 border-b border-border align-middle";

export function PatientTable({ rows, onRowClick, sort, order, onSortChange }: Props) {
  return (
    <table className="w-full border-collapse text-[13.5px]">
      <thead>
        <tr className="bg-bg-subtle">
          <th className={cn(HEAD, "w-[36%]")}>
            <SortHeader
              label="Patient"
              field="name"
              activeField={sort}
              order={order}
              onChange={onSortChange}
            />
          </th>
          <th className={HEAD}>Age</th>
          <th className={HEAD}>
            <SortHeader
              label="Last visit"
              field="last_visit"
              activeField={sort}
              order={order}
              onChange={onSortChange}
            />
          </th>
          <th className={HEAD}>Conditions</th>
          <th className={HEAD}>Status</th>
          <th className={HEAD} />
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr
            key={p.id}
            onClick={() => onRowClick(p.id)}
            className="cursor-pointer hover:bg-bg-subtle"
          >
            <td className={TD}>
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-accent-bg text-[12px] font-semibold text-accent-fg">
                  {initials(p.name)}
                </div>
                <div>
                  <div className="font-medium text-fg">{p.name}</div>
                  <div className="font-mono text-[11px] text-fg-subtle">
                    {p.mrn} · {p.blood_type}
                  </div>
                </div>
              </div>
            </td>
            <td className={TD}>{p.age}</td>
            <td className={cn(TD, "font-mono text-[12px] text-fg-muted")}>
              {p.last_visit ? formatDate(p.last_visit) : "—"}
            </td>
            <td className={TD}>
              {!p.conditions || p.conditions.length === 0 ? (
                <Chip>—</Chip>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {p.conditions.map((c) => (
                    <Chip key={c}>{c}</Chip>
                  ))}
                </div>
              )}
            </td>
            <td className={TD}>
              <StatusPill status={p.status} />
            </td>
            <td className={cn(TD, "text-right text-fg-subtle")}>
              <ChevronRight className="ml-auto h-4 w-4" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-bg-subtle px-2.5 py-0.5 text-[11.5px] text-fg-muted">
      {children}
    </span>
  );
}

function SortHeader({
  label,
  field,
  activeField,
  order,
  onChange,
}: {
  label: string;
  field: SortField;
  activeField?: string;
  order?: "asc" | "desc";
  onChange?: (sort: SortField) => void;
}) {
  if (!onChange) return <>{label}</>;
  const active = activeField === field;
  return (
    <button
      type="button"
      onClick={() => onChange(field)}
      className={cn(
        "inline-flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.08em]",
        active ? "text-fg" : "text-fg-subtle hover:text-fg",
      )}
    >
      {label}
      {active && <span>{order === "desc" ? "↓" : "↑"}</span>}
    </button>
  );
}
