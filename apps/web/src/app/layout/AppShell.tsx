import { Outlet } from "react-router-dom";

import { ErrorBoundary } from "@/app/ErrorBoundary";
import { Sidebar } from "@/app/layout/Sidebar";
import { Topbar } from "@/app/layout/Topbar";

export function AppShell() {
  return (
    <div className="grid h-full grid-cols-[232px_1fr]">
      <Sidebar />
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
