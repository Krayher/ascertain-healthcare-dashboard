import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

import { router } from "@/app/router";
import { applyTheme, useTheme } from "@/lib/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export function Providers() {
  const theme = useTheme((s) => s.theme);
  useEffect(() => applyTheme(theme), [theme]);
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
