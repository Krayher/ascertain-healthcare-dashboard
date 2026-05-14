import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  api,
  type Note,
  type NoteCreatePayload,
  type Patient,
  type PatientCreatePayload,
  type PatientPage,
  type Summary,
} from "@/lib/api/client";

export type ListParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  sort?: "last_visit_at" | "name" | "created_at";
  order?: "asc" | "desc";
};

function toQuery(params: ListParams): string {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  qs.set("page_size", String(params.pageSize));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.sort) qs.set("sort", params.sort);
  if (params.order) qs.set("order", params.order);
  return qs.toString();
}

export function usePatients(params: ListParams) {
  return useQuery<PatientPage>({
    queryKey: ["patients", params],
    queryFn: () => api(`/patients?${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function usePatient(id: string | undefined) {
  return useQuery<Patient>({
    queryKey: ["patient", id],
    queryFn: () => api(`/patients/${id}`),
    enabled: !!id,
  });
}

export function useNotes(id: string | undefined) {
  return useQuery<Note[]>({
    queryKey: ["notes", id],
    queryFn: () => api(`/patients/${id}/notes`),
    enabled: !!id,
  });
}

export function useSummary(id: string | undefined) {
  return useQuery<Summary>({
    queryKey: ["summary", id],
    queryFn: () => api(`/patients/${id}/summary`),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PatientCreatePayload) =>
      api<Patient>("/patients", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatientCreatePayload }) =>
      api<Patient>(`/patients/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: (patient) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patient", patient.id] });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/patients/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useAddNote(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NoteCreatePayload) =>
      api<Note>(`/patients/${patientId}/notes`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", patientId] });
      qc.invalidateQueries({ queryKey: ["summary", patientId] });
      qc.invalidateQueries({ queryKey: ["patient", patientId] });
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useDeleteNote(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      api<void>(`/patients/${patientId}/notes/${noteId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", patientId] });
      qc.invalidateQueries({ queryKey: ["summary", patientId] });
    },
  });
}
