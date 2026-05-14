import { useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  author: string;
  onSubmit: (content: string) => Promise<void>;
  pending?: boolean;
};

export function NoteComposer({ author, onSubmit, pending }: Props) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Note cannot be empty.");
      return;
    }
    try {
      await onSubmit(trimmed);
      setContent("");
    } catch (err) {
      setError((err as Error).message ?? "Failed to save note.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-lg border border-dashed border-border-strong p-4"
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a clinical note…"
        className="w-full resize-none border-0 bg-transparent text-[13.5px] leading-relaxed text-fg outline-none"
        rows={3}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[11.5px] text-fg-subtle">
          Authored as {author} · timestamp captured on save.
        </span>
        <Button type="submit" disabled={pending} className="px-3 py-1.5 text-[12px]">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
