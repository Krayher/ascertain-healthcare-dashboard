import type { Patient } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

export function SideRail({ patient }: { patient: Patient }) {
  return (
    <aside className="flex flex-col gap-4">
      <Card title="Identifiers">
        <KV k="DOB" v={formatDate(patient.date_of_birth)} />
        <KV k="Phone" v={patient.phone} />
        <KV k="Email" v={patient.email ?? "—"} />
        <KV k="Address" v={patient.address ?? "—"} />
      </Card>

      <Card title="Clinical">
        <KV k="Blood type" v={patient.blood_type} />
        <div className="mt-3">
          <div className="mb-1.5 text-[11.5px] text-fg-subtle">Conditions</div>
          <ChipRow values={patient.conditions ?? []} />
        </div>
        <div className="mt-3">
          <div className="mb-1.5 text-[11.5px] text-fg-subtle">Allergies</div>
          <ChipRow values={patient.allergies ?? []} warn />
        </div>
      </Card>
    </aside>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elev p-4">
      <h4 className="m-0 mb-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
        {title}
      </h4>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-x-2.5 gap-y-2 py-1 text-[13px]">
      <div className="text-fg-muted">{k}</div>
      <div className="text-fg break-words">{v}</div>
    </div>
  );
}

function ChipRow({ values, warn }: { values: string[]; warn?: boolean }) {
  if (values.length === 0) {
    return <div className="text-[12px] text-fg-subtle">none recorded</div>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span
          key={v}
          className={
            warn
              ? "rounded-full border border-transparent bg-warn-bg px-2.5 py-0.5 text-[11.5px] text-warn"
              : "rounded-full border border-border bg-bg-subtle px-2.5 py-0.5 text-[11.5px] text-fg-muted"
          }
        >
          {v}
        </span>
      ))}
    </div>
  );
}
