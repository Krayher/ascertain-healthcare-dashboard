type Props = {
  active: number;
  followUp: number;
  inactive: number;
};

const SEGMENTS = [
  { key: "active", label: "Active", colorVar: "var(--accent)" },
  { key: "follow_up", label: "Follow-up", colorVar: "var(--warn)" },
  { key: "inactive", label: "Inactive", colorVar: "var(--fg-subtle)" },
] as const;

export function StatusDistribution({ active, followUp, inactive }: Props) {
  const total = active + followUp + inactive;
  const values = { active, follow_up: followUp, inactive };

  if (total === 0) {
    return (
      <div className="p-6 text-sm text-fg-muted">No patients yet.</div>
    );
  }

  let offset = 0;
  return (
    <div className="px-4 py-5">
      <div
        className="relative h-8 w-full overflow-hidden rounded-md border border-border"
        role="img"
        aria-label={`Status distribution: ${active} active, ${followUp} follow-up, ${inactive} inactive`}
      >
        {SEGMENTS.map((seg) => {
          const v = values[seg.key];
          const widthPct = (v / total) * 100;
          const left = offset;
          offset += widthPct;
          if (v === 0) return null;
          return (
            <div
              key={seg.key}
              className="absolute inset-y-0"
              style={{
                left: `${left}%`,
                width: `${widthPct}%`,
                background: seg.colorVar,
              }}
              title={`${seg.label}: ${v} (${widthPct.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
        {SEGMENTS.map((seg) => {
          const v = values[seg.key];
          const pct = total === 0 ? 0 : (v / total) * 100;
          return (
            <li key={seg.key} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: seg.colorVar }}
                aria-hidden
              />
              <div className="flex flex-col leading-tight">
                <span className="text-fg-muted">{seg.label}</span>
                <span className="font-mono text-fg">
                  {v} <span className="text-fg-subtle">· {pct.toFixed(0)}%</span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
