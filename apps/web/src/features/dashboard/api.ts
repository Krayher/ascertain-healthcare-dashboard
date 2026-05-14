import { useQuery } from "@tanstack/react-query";

import { api, type Dashboard } from "@/lib/api/client";

export function useDashboard() {
  return useQuery<Dashboard>({
    queryKey: ["dashboard"],
    queryFn: () => api("/stats/dashboard"),
    refetchInterval: 30_000,
  });
}
