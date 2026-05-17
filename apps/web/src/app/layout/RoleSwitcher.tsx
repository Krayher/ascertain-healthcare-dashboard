import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { ROLE_PROFILES, type Role, useRole } from "@/lib/role";

export function RoleSwitcher() {
  const role = useRole((s) => s.role);
  const setRole = useRole((s) => s.setRole);
  const profile = ROLE_PROFILES[role];
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: Role) {
    if (next === role) {
      setOpen(false);
      return;
    }
    setRole(next);
    setOpen(false);
    // Defer one tick so the zustand persist middleware flushes the new
    // role to localStorage before we navigate away.
    setTimeout(() => window.location.reload(), 0);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Switch role"
        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-bg-elev"
      >
        <div className="grid h-7 w-7 place-items-center rounded-full bg-accent-bg text-[12px] font-semibold text-accent-fg">
          {profile.initials}
        </div>
        <div className="min-w-0 flex-1 text-[12.5px]">
          <div className="truncate leading-tight">{profile.displayName}</div>
          <div className="truncate text-[11px] text-fg-subtle">
            {profile.label}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-fg-subtle transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-md border border-border bg-bg-elev shadow-lg"
        >
          <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            Switch role
          </div>
          {Object.values(ROLE_PROFILES).map((option) => {
            const selected = option.id === role;
            return (
              <button
                key={option.id}
                role="menuitemradio"
                aria-checked={selected}
                type="button"
                onClick={() => pick(option.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-bg-subtle",
                  selected && "bg-bg-subtle",
                )}
              >
                <div className="grid h-6 w-6 place-items-center rounded-full bg-accent-bg text-[11px] font-semibold text-accent-fg">
                  {option.initials}
                </div>
                <div className="flex-1">
                  <div className="leading-tight">{option.label}</div>
                  <div className="text-[11px] text-fg-subtle">
                    {option.displayName}
                  </div>
                </div>
                {selected && <Check className="h-3.5 w-3.5 text-accent" />}
              </button>
            );
          })}
          <div className="border-t border-border bg-bg-subtle/50 px-3 py-2 text-[11px] leading-snug text-fg-subtle">
            Demo: role gates UI only. Real enforcement requires auth.
          </div>
        </div>
      )}
    </div>
  );
}
