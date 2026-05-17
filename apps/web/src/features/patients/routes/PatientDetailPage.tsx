import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ConfirmDelete } from "@/features/patients/components/ConfirmDelete";
import { PatientHeader } from "@/features/patients/components/PatientHeader";
import { SideRail } from "@/features/patients/components/SideRail";
import { SummaryPanel } from "@/features/patients/components/SummaryPanel";
import { NoteComposer } from "@/features/notes/components/NoteComposer";
import { NotesList } from "@/features/notes/components/NotesList";
import {
  useAddNote,
  useDeleteNote,
  useDeletePatient,
  useNotes,
  usePatient,
  useSummary,
} from "@/features/patients/api";

export default function PatientDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const patient = usePatient(id);
  const notes = useNotes(id);
  const summary = useSummary(id);
  const addNote = useAddNote(id ?? "");
  const deleteNote = useDeleteNote(id ?? "");
  const deletePatient = useDeletePatient();

  if (patient.isLoading) {
    return <div className="p-8 text-sm text-fg-muted">Loading patient…</div>;
  }
  if (patient.isError || !patient.data) {
    return (
      <div className="p-8 text-sm text-danger">
        Patient not found.{" "}
        <button className="underline" onClick={() => nav("/patients")}>
          Back to list
        </button>
      </div>
    );
  }

  const p = patient.data;

  return (
    <>
      <PatientHeader patient={p} onDelete={() => setConfirmOpen(true)} />

      <div className="grid grid-cols-1 gap-5 px-4 py-6 md:grid-cols-[1fr_320px] md:px-8">
        <div className="min-w-0">
          <SummaryPanel data={summary.data} loading={summary.isLoading} />

          <div className="mb-3 flex items-center justify-between">
            <h3 className="m-0 text-sm font-semibold">Clinical notes</h3>
            <span className="font-mono text-[12px] text-fg-subtle">
              most recent first
            </span>
          </div>

          {notes.isLoading && (
            <div className="text-sm text-fg-muted">Loading notes…</div>
          )}
          {notes.data && (
            <NotesList
              notes={notes.data}
              onDelete={(noteId) => deleteNote.mutate(noteId)}
            />
          )}

          <NoteComposer
            pending={addNote.isPending}
            onSubmit={async (content) => {
              await addNote.mutateAsync({ content });
            }}
          />
        </div>

        <SideRail patient={p} />
      </div>

      <ConfirmDelete
        open={confirmOpen}
        expectedName={p.name}
        pending={deletePatient.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await deletePatient.mutateAsync(p.id);
          setConfirmOpen(false);
          nav("/patients");
        }}
      />
    </>
  );
}
