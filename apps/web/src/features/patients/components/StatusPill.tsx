import { cn } from "@/lib/cn";

type Status = "active" | "follow_up" | "inactive" | string;

const styles: Record<string, string> = {
  active: "bg-ok-bg text-ok",
  follow_up: "bg-warn-bg text-warn",
  inactive: "bg-inactive-bg text-inactive",
};

const labels: Record<string, string> = {
  active: "Active",
  follow_up: "Follow-up",
  inactive: "Inactive",
};

export function StatusPill({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium",
        styles[status] ?? "bg-bg-subtle text-fg-muted",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status] ?? status}
    </span>
  );
}
