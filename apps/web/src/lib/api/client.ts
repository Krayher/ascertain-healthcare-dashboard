import type { paths } from "@/lib/api/schema";

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/v1";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown) {
    super(`API ${status}`);
    this.status = status;
    this.payload = payload;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      payload = await res.text();
    }
    throw new ApiError(res.status, payload);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

type J<T> = T extends { content: { "application/json": infer U } } ? U : never;

export type Patient = J<
  paths["/api/v1/patients/{patient_id}"]["get"]["responses"]["200"]
>;
export type PatientPage = J<
  paths["/api/v1/patients"]["get"]["responses"]["200"]
>;
export type PatientCreatePayload = J<
  NonNullable<paths["/api/v1/patients"]["post"]["requestBody"]>
>;
export type Note = J<
  paths["/api/v1/patients/{patient_id}/notes"]["get"]["responses"]["200"]
>[number];
export type NoteCreatePayload = J<
  NonNullable<paths["/api/v1/patients/{patient_id}/notes"]["post"]["requestBody"]>
>;
export type Summary = J<
  paths["/api/v1/patients/{patient_id}/summary"]["get"]["responses"]["200"]
>;
export type Dashboard = J<
  paths["/api/v1/stats/dashboard"]["get"]["responses"]["200"]
>;
