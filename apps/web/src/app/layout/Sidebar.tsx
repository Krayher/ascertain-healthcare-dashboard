import {
  CalendarDays,
  LayoutGrid,
  Moon,
  NotebookPen,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { RoleSwitcher } from "@/app/layout/RoleSwitcher";
import { cn } from "@/lib/cn";
import { useTheme } from "@/lib/theme";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
};

const ITEMS: Item[] = [
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/notes", label: "Notes", icon: NotebookPen },
];

export function Sidebar() {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);

  return (
    <aside className="flex h-full flex-col border-r border-border bg-bg-subtle px-3 py-5">
      <div className="px-3 pb-6 font-serif text-2xl tracking-tight">
        ascertain<span className="text-accent">.</span>
      </div>

      <div className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
        Workspace
      </div>
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13.5px] transition-colors",
              isActive
                ? "bg-bg-elev text-fg font-medium shadow-sm"
                : "text-fg-muted hover:bg-bg-elev hover:text-fg",
            )
          }
        >
          <Icon className="h-4 w-4 opacity-80" />
          {label}
        </NavLink>
      ))}

      <div className="px-3 pb-1.5 pt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
        Account
      </div>
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13.5px] text-fg-muted transition-colors hover:bg-bg-elev hover:text-fg"
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4 opacity-80" />
        ) : (
          <Moon className="h-4 w-4 opacity-80" />
        )}
        {theme === "dark" ? "Light theme" : "Dark theme"}
      </button>
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          cn(
            "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13.5px] transition-colors",
            isActive
              ? "bg-bg-elev text-fg font-medium"
              : "text-fg-muted hover:bg-bg-elev hover:text-fg",
          )
        }
      >
        <Settings className="h-4 w-4 opacity-80" />
        Settings
      </NavLink>

      <div className="mt-auto border-t border-border pt-2">
        <RoleSwitcher />
      </div>
    </aside>
  );
}
