import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/features/patients/components/StatusPill";
import type { Patient } from "@/lib/api/client";
import { formatDate, initials } from "@/lib/format";

type Props = {
  patient: Patient;
  onDelete: () => void;
};

export function PatientHeader({ patient, onDelete }: Props) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-5 border-b border-border px-8 py-6">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-accent-bg text-[22px] font-semibold text-accent-fg">
        {initials(patient.name)}
      </div>
      <div>
        <h1 className="m-0 font-serif text-4xl leading-none tracking-tight">
          {patient.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-fg-muted">
          <span>
            {patient.age} years · {patient.blood_type}
          </span>
          <Dot />
          <span>
            MRN <span className="font-mono text-fg">{patient.mrn}</span>
          </span>
          <Dot />
          <span>
            Last visit{" "}
            <span className="font-mono text-fg">
              {formatDate(patient.last_visit ?? null)}
            </span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <StatusPill status={patient.status} className="text-[12px]" />
        <Link to={`/patients/${patient.id}/edit`}>
          <Button variant="ghost">Edit</Button>
        </Link>
        <Button variant="danger" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-fg-subtle" />;
}
