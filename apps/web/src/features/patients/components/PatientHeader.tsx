import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/features/patients/components/StatusPill";
import type { Patient } from "@/lib/api/client";
import { formatDate, initials } from "@/lib/format";
import { useCan } from "@/lib/role";

type Props = {
  patient: Patient;
  onDelete: () => void;
};

export function PatientHeader({ patient, onDelete }: Props) {
  const canEdit = useCan("patient:edit");
  const canDelete = useCan("patient:delete");
  return (
    <div className="flex flex-col gap-4 border-b border-border px-4 py-5 md:grid md:grid-cols-[auto_1fr_auto] md:items-center md:gap-5 md:px-8 md:py-6">
      <div className="flex items-center gap-4 md:contents">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-bg text-[18px] font-semibold text-accent-fg md:h-16 md:w-16 md:text-[22px]">
          {initials(patient.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="m-0 truncate font-serif text-2xl leading-tight tracking-tight md:text-4xl md:leading-none">
            {patient.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-fg-muted md:text-[13px]">
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
      </div>
      <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
        <StatusPill status={patient.status} className="text-[12px]" />
        {canEdit && (
          <Link to={`/patients/${patient.id}/edit`}>
            <Button variant="ghost">Edit</Button>
          </Link>
        )}
        {canDelete && (
          <Button variant="danger" onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-fg-subtle" />;
}
