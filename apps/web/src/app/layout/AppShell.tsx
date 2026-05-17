import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { ErrorBoundary } from "@/app/ErrorBoundary";
import { Sidebar } from "@/app/layout/Sidebar";
import { Topbar } from "@/app/layout/Topbar";
import { useSidebar } from "@/app/layout/sidebar-state";

// Tailwind `md` breakpoint = 768px.
const MD_QUERY = "(min-width: 768px)";

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia(MD_QUERY).matches;
  });
  useEffect(() => {
    const mq = window.matchMedia(MD_QUERY);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

export function AppShell() {
  const open = useSidebar((s) => s.open);
  const setOpen = useSidebar((s) => s.set);
  const { pathname } = useLocation();
  const isDesktop = useIsDesktop();

  // Close the drawer on navigation so tapping a nav link doesn't leave it open.
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  // Close on Escape when the drawer is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Only the small-screen drawer is "hideable" — on desktop the sidebar
  // is permanently visible and aria-hidden must not be set.
  const sidebarHidden = !isDesktop && !open;

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[232px_1fr]">
      <div
        aria-hidden={sidebarHidden || undefined}
        className={`fixed inset-y-0 left-0 z-40 w-[260px] transform bg-bg-subtle transition-transform md:static md:z-auto md:w-auto md:translate-x-0 ${
          open ? "translate-x-0 shadow-xl" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar />
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
        />
      )}

      <div className="flex min-w-0 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
