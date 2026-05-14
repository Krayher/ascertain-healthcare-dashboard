import { Sparkles } from "lucide-react";

import type { Summary } from "@/lib/api/client";

type Props = {
  data?: Summary;
  loading?: boolean;
};

export function SummaryPanel({ data, loading }: Props) {
  return (
    <section className="mb-5 rounded-lg border border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent-bg)_60%,var(--bg-elev))_0%,var(--bg-elev)_70%)] p-6">
      <div className="mb-3 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent-fg">
        <Sparkles className="h-3 w-3" />
        AI-assisted summary
      </div>
      {loading || !data ? (
        <div className="space-y-2">
          <div className="h-5 w-full animate-pulse rounded bg-bg-subtle" />
          <div className="h-5 w-11/12 animate-pulse rounded bg-bg-subtle" />
          <div className="h-5 w-9/12 animate-pulse rounded bg-bg-subtle" />
        </div>
      ) : (
        <>
          <p className="m-0 font-serif text-[19px] leading-relaxed text-fg">
            {data.summary}
          </p>
          <div className="mt-3.5 font-mono text-[12px] text-fg-muted">
            Synthesized from {data.note_count} note
            {data.note_count === 1 ? "" : "s"} ·{" "}
            <span className="text-fg">source: {data.source}</span>
          </div>
        </>
      )}
    </section>
  );
}
