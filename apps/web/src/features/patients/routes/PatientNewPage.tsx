import { useNavigate, useParams } from "react-router-dom";

import { PatientForm } from "@/features/patients/components/PatientForm";
import type { PatientFormValues } from "@/features/patients/schema";
import {
  useCreatePatient,
  usePatient,
  useUpdatePatient,
} from "@/features/patients/api";
import type { PatientCreatePayload } from "@/lib/api/client";
import { useCan } from "@/lib/role";

export default function PatientNewPage() {
  const { id } = useParams();
  const editing = !!id;
  const nav = useNavigate();
  const patient = usePatient(id);
  const createMut = useCreatePatient();
  const updateMut = useUpdatePatient();
  const canCreate = useCan("patient:create");
  const canEdit = useCan("patient:edit");

  if ((editing && !canEdit) || (!editing && !canCreate)) {
    return (
      <div className="p-8">
        <h1 className="mb-2 text-2xl font-semibold">Not authorized</h1>
        <p className="text-sm text-fg-muted">
          Your current role doesn&apos;t allow{" "}
          {editing ? "editing patients" : "creating patients"}. Switch to
          Administrator from the avatar in the lower-left to continue.
        </p>
        <button
          type="button"
          className="mt-3 text-sm underline"
          onClick={() => nav(editing ? `/patients/${id}` : "/patients")}
        >
          Back
        </button>
      </div>
    );
  }

  if (editing && patient.isLoading) {
    return <div className="p-8 text-sm text-fg-muted">Loading patient…</div>;
  }
  if (editing && (patient.isError || !patient.data)) {
    return (
      <div className="p-8 text-sm text-danger">
        Patient not found.{" "}
        <button className="underline" onClick={() => nav("/patients")}>
          Back to list
        </button>
      </div>
    );
  }

  const initial: Partial<PatientFormValues> | undefined = patient.data
    ? {
        name: patient.data.name,
        date_of_birth: patient.data.date_of_birth,
        contact: patient.data.contact,
        address: patient.data.address ?? "",
        blood_type: patient.data.blood_type as PatientFormValues["blood_type"],
        status: patient.data.status as PatientFormValues["status"],
        conditions: patient.data.conditions ?? [],
        allergies: patient.data.allergies ?? [],
      }
    : undefined;

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <div className="py-7">
      <header className="mb-6 px-8">
        <h1 className="font-serif text-4xl leading-none tracking-tight">
          {editing ? (
            <>Edit <em className="italic">{patient.data?.name}</em></>
          ) : (
            <>Register a <em className="italic">new patient</em>.</>
          )}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-fg-muted">
          All fields validated client-side and server-side. Required fields marked with{" "}
          <span className="text-danger">·</span>.
        </p>
      </header>

      <PatientForm
        initial={initial}
        submitLabel={editing ? "Save changes" : "Create patient"}
        pending={pending}
        onCancel={() =>
          editing ? nav(`/patients/${id}`) : nav("/patients")
        }
        onSubmit={async (values) => {
          const payload = values as unknown as PatientCreatePayload;
          if (editing) {
            const saved = await updateMut.mutateAsync({ id: id!, body: payload });
            nav(`/patients/${saved.id}`);
          } else {
            const saved = await createMut.mutateAsync(payload);
            nav(`/patients/${saved.id}`);
          }
        }}
      />
    </div>
  );
}
