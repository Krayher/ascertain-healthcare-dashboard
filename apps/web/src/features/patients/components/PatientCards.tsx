import { StatusPill } from "@/features/patients/components/StatusPill";
import type { Patient } from "@/lib/api/client";
import { formatDate, initials } from "@/lib/format";

type Props = {
  rows: Patient[];
  onRowClick: (id: string) => void;
};

export function PatientCards({ rows, onRowClick }: Props) {
  return (
    <ul
      role="list"
      className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {rows.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onRowClick(p.id)}
            className="group flex h-full w-full flex-col gap-3 rounded-lg border border-border bg-bg-elev p-4 text-left transition-colors hover:border-border-strong hover:bg-bg-subtle"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-bg text-[13px] font-semibold text-accent-fg">
                {initials(p.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium text-fg">
                  {p.name}
                </div>
                <div className="font-mono text-[11px] text-fg-subtle">
                  {p.mrn} · {p.blood_type}
                </div>
              </div>
              <StatusPill status={p.status} className="shrink-0 text-[11px]" />
            </div>

            <dl className="grid grid-cols-2 gap-2 text-[12px]">
              <div>
                <dt className="text-fg-subtle">Age</dt>
                <dd className="text-fg">{p.age}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Last visit</dt>
                <dd className="font-mono text-[11.5px] text-fg">
                  {p.last_visit ? formatDate(p.last_visit) : "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-auto">
              <div className="mb-1 text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
                Conditions
              </div>
              {!p.conditions || p.conditions.length === 0 ? (
                <span className="text-[11.5px] text-fg-subtle">none recorded</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {p.conditions.slice(0, 3).map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-[11px] text-fg-muted"
                    >
                      {c}
                    </span>
                  ))}
                  {p.conditions.length > 3 && (
                    <span className="text-[11px] text-fg-subtle">
                      +{p.conditions.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
