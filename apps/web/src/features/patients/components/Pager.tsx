import { cn } from "@/lib/cn";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export function Pager({ page, pageSize, total, totalPages, onChange }: Props) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pages = collectPages(page, totalPages);

  return (
    <div className="flex items-center justify-between px-3.5 py-3 text-[12.5px] text-fg-muted">
      <div>
        Showing <span className="font-mono">{start}–{end}</span> of{" "}
        <span className="font-mono">{total}</span>
      </div>
      <div className="flex gap-1">
        <PageBtn label="‹" disabled={page <= 1} onClick={() => onChange(page - 1)} />
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="grid h-7 w-7 place-items-center text-fg-subtle">
              …
            </span>
          ) : (
            <PageBtn
              key={p}
              label={String(p)}
              active={p === page}
              onClick={() => onChange(p)}
            />
          ),
        )}
        <PageBtn
          label="›"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        />
      </div>
    </div>
  );
}

function PageBtn({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-md font-mono text-[12px] transition-colors",
        active
          ? "bg-fg text-bg"
          : "text-fg hover:bg-bg-subtle",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      {label}
    </button>
  );
}

function collectPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}
