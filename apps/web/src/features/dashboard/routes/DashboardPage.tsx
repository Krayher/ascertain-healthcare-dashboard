import { Link } from "react-router-dom";

import { StatusDistribution } from "@/features/dashboard/components/StatusDistribution";
import { useDashboard } from "@/features/dashboard/api";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="px-4 py-6 md:px-8 md:py-7">
      <header className="mb-6">
        <h1 className="font-serif text-2xl leading-tight tracking-tight md:text-4xl md:leading-none">
          Good morning, <span className="font-semibold">Anya</span>.
        </h1>
        <p className="mt-1.5 text-[13px] text-fg-muted md:text-[13.5px]">
          {today} · {data ? `${data.stats.follow_up_patients} follow-ups scheduled` : "loading…"} ·{" "}
          {data ? `${data.stats.notes_this_week} notes this week` : ""}
        </p>
      </header>

      {isError && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load dashboard data.
        </div>
      )}

      <section className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active patients" value={data?.stats.active_patients} loading={isLoading} />
        <Stat
          label="Follow-ups due"
          value={data?.stats.follow_up_patients}
          loading={isLoading}
          tone="warn"
        />
        <Stat
          label="Notes this week"
          value={data?.stats.notes_this_week}
          loading={isLoading}
        />
        <Stat
          label="Total patients"
          value={data?.stats.total_patients}
          loading={isLoading}
        />
      </section>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel title="Notes activity" subtitle="last 14 days">
          {data ? <Bars activity={data.activity} /> : <Skeleton h={140} />}
        </Panel>

        <Panel title="Status distribution" subtitle="all patients">
          {data ? (
            <StatusDistribution
              active={data.stats.active_patients}
              followUp={data.stats.follow_up_patients}
              inactive={data.stats.inactive_patients}
            />
          ) : (
            <Skeleton h={140} />
          )}
        </Panel>
      </div>

      <div className="grid gap-4">
        <Panel title="Recent activity" subtitle={data ? "live" : ""}>
          {!data ? (
            <Skeleton h={200} />
          ) : data.recent_notes.length === 0 ? (
            <div className="p-6 text-sm text-fg-muted">No recent notes.</div>
          ) : (
            <ul className="divide-y divide-dashed divide-border">
              {data.recent_notes.map((n) => (
                <li key={n.id} className="px-4 py-2.5">
                  <Link
                    to={`/patients/${n.patient_id}`}
                    className="block text-[13px] leading-snug hover:underline"
                  >
                    <span className="font-medium text-fg">{n.patient_name}</span>{" "}
                    <span className="text-fg-muted">— {trunc(n.content, 70)}</span>
                  </Link>
                  <div className="mt-0.5 font-mono text-[11px] text-fg-subtle">
                    {formatDateTime(n.timestamp)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  loading,
  tone,
}: {
  label: string;
  value?: number;
  loading?: boolean;
  tone?: "warn";
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-elev px-4 py-4">
      <div className="mb-2 text-[12px] text-fg-muted">{label}</div>
      {loading ? (
        <div className="h-9 w-20 animate-pulse rounded bg-bg-subtle" />
      ) : (
        <div
          className={cn(
            "font-serif text-[28px] leading-none tracking-tight md:text-[34px]",
            tone === "warn" && value && value > 0 ? "text-warn" : "text-fg",
          )}
        >
          {value ?? "—"}
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-elev">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <h3 className="m-0 text-sm font-semibold">{title}</h3>
        {subtitle && <span className="font-mono text-[12px] text-fg-subtle">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function Bars({ activity }: { activity: number[] }) {
  const max = Math.max(1, ...activity);
  const labels = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div className="px-4 py-5">
      <div
        className="grid items-end gap-1.5"
        style={{ gridTemplateColumns: `repeat(${activity.length}, 1fr)`, height: 132 }}
      >
        {activity.map((count, i) => (
          <div
            key={i}
            className={cn(
              "rounded-t-[3px] bg-accent transition-colors",
              i === activity.length - 1 && "opacity-80",
            )}
            style={{ height: `${Math.max(6, (count / max) * 100)}%` }}
            title={`${count} note${count === 1 ? "" : "s"}`}
          />
        ))}
      </div>
      <div
        className="mt-2 grid gap-1.5 font-mono text-[10px] text-fg-subtle"
        style={{ gridTemplateColumns: `repeat(${activity.length}, 1fr)` }}
      >
        {activity.map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (activity.length - 1 - i));
          return (
            <span key={i} className="text-center">
              {labels[date.getDay()]}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Skeleton({ h }: { h: number }) {
  return <div className="m-4 animate-pulse rounded bg-bg-subtle" style={{ height: h }} />;
}

function trunc(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n).trimEnd() + "…";
}
