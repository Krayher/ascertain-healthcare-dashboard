import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  expectedName: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
};

export function ConfirmDelete({
  expectedName,
  open,
  onCancel,
  onConfirm,
  pending,
}: Props) {
  const [value, setValue] = useState("");

  if (!open) return null;
  const matches = value.trim().toLowerCase() === expectedName.toLowerCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-bg-elev p-6 shadow-xl">
        <h2 className="mb-2 text-xl font-semibold">Delete patient?</h2>
        <p className="text-[13.5px] text-fg-muted">
          This permanently removes the patient and all of their notes. To
          confirm, type the patient&apos;s name{" "}
          <strong className="text-fg">{expectedName}</strong> below.
        </p>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={expectedName}
          autoFocus
          className="mt-3"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={!matches || pending}
          >
            {pending ? "Deleting…" : "Delete patient"}
          </Button>
        </div>
      </div>
    </div>
  );
}
