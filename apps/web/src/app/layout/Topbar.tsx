import { Menu, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { TopbarSearch } from "@/app/layout/TopbarSearch";
import { useSidebar } from "@/app/layout/sidebar-state";
import { Button } from "@/components/ui/button";
import { useCan } from "@/lib/role";

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
  const canCreate = useCan("patient:create");
  const openSidebar = useSidebar((s) => s.set);

  // On very small screens we only show the deepest crumb so the header
  // fits a hamburger + breadcrumb + actions on one line.
  const lastCrumb = crumbs[crumbs.length - 1];

  return (
    <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 md:px-6 md:py-3.5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => openSidebar(true)}
          aria-label="Open menu"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Full breadcrumb trail on md+ */}
        <nav className="hidden min-w-0 items-center gap-2 text-[13px] text-fg-muted md:flex">
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

        {/* Just the current page name on small screens */}
        <span className="truncate text-sm font-medium text-fg md:hidden">
          {lastCrumb?.label}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <TopbarSearch />
        {canCreate && (
          <Link to="/patients/new" aria-label="Register new patient">
            {/* Icon-only on phones, labeled button on md+ */}
            <Button className="hidden md:inline-flex">+ New patient</Button>
            <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-accent-fg md:hidden">
              <Plus className="h-4 w-4" />
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
