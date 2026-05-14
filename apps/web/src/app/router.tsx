import { lazy, Suspense, type JSX } from "react";
import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/app/layout/AppShell";

const Dashboard = lazy(() => import("@/features/dashboard/routes/DashboardPage"));
const PatientList = lazy(() => import("@/features/patients/routes/PatientListPage"));
const PatientDetail = lazy(() => import("@/features/patients/routes/PatientDetailPage"));
const PatientNew = lazy(() => import("@/features/patients/routes/PatientNewPage"));
const NotFound = lazy(() => import("@/app/routes/NotFoundPage"));

const wrap = (element: JSX.Element) => (
  <Suspense fallback={<div className="p-8 text-fg-muted">Loading…</div>}>
    {element}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: wrap(<Dashboard />) },
      { path: "/patients", element: wrap(<PatientList />) },
      { path: "/patients/new", element: wrap(<PatientNew />) },
      { path: "/patients/:id/edit", element: wrap(<PatientNew />) },
      { path: "/patients/:id", element: wrap(<PatientDetail />) },
      { path: "*", element: wrap(<NotFound />) },
    ],
  },
]);
