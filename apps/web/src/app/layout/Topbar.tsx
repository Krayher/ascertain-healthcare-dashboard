import { Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";

function useCrumbs() {
  const { pathname } = useLocation();
  if (pathname === "/") return [{ label: "Workspace", to: "/" }, { label: "Overview" }];
  if (pathname.startsWith("/patients/new"))
    return [
      { label: "Workspace", to: "/" },
      { label: "Patients", to: "/patients" },
      { label: "New patient" },
    ];
  if (pathname.startsWith("/patients/")) {
    return [
      { label: "Workspace", to: "/" },
      { label: "Patients", to: "/patients" },
      { label: "Detail" },
    ];
  }
  if (pathname.startsWith("/patients"))
    return [
      { label: "Workspace", to: "/" },
      { label: "Patients" },
    ];
  return [{ label: "Workspace", to: "/" }];
}

export function Topbar() {
  const crumbs = useCrumbs();
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3.5">
      <nav className="flex items-center gap-2 text-[13px] text-fg-muted">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            {c.to ? (
              <Link to={c.to} className="hover:text-fg">
                {c.label}
              </Link>
            ) : (
              <span className="text-fg">{c.label}</span>
            )}
            {i < crumbs.length - 1 && <span className="text-fg-subtle">/</span>}
          </span>
        ))}
      </nav>
      <div className="flex items-center gap-2.5">
        <div className="hidden items-center gap-2 rounded-md border border-border bg-bg-subtle px-2.5 py-1.5 text-[13px] text-fg-muted md:flex">
          <Search className="h-3.5 w-3.5" />
          Search patients, notes, MRN…
          <span className="ml-2 rounded border border-border-strong bg-bg-elev px-1.5 py-px font-mono text-[10.5px] text-fg-subtle">
            ⌘K
          </span>
        </div>
        <Link to="/patients/new">
          <Button>+ New patient</Button>
        </Link>
      </div>
    </header>
  );
}
