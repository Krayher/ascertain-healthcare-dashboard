import type { Note } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";

type Props = {
  notes: Note[];
  onDelete: (noteId: string) => void;
};

export function NotesList({ notes, onDelete }: Props) {
  if (notes.length === 0) {
    return (
      <p className="text-sm text-fg-muted">
        No clinical notes recorded yet.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {notes.map((n) => (
        <li
          key={n.id}
          className="rounded-lg border border-border bg-bg-elev p-4"
        >
          <div className="mb-1.5 flex items-center gap-2.5 text-[12px] text-fg-muted">
            <span className="font-mono text-[11px] text-fg-subtle">
              {formatDateTime(n.timestamp)}
            </span>
            <button
              type="button"
              onClick={() => onDelete(n.id)}
              className="ml-auto text-[12px] text-fg-subtle hover:text-danger"
            >
              Delete
            </button>
          </div>
          <p className="m-0 text-[13.5px] leading-relaxed text-fg">{n.content}</p>
        </li>
      ))}
    </ul>
  );
}
