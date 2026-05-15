const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

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

export type BloodType =
  | "O+"
  | "O-"
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-";

export type PatientStatus = "active" | "follow_up" | "inactive";

export type Patient = {
  id: string;
  name: string;
  date_of_birth: string;
  contact: string;
  address: string | null;
  blood_type: BloodType;
  status: PatientStatus;
  conditions: string[];
  allergies: string[];
  last_visit: string | null;
  created_at: string;
  updated_at: string;
  age: number;
  mrn: string;
};

export type PatientCreatePayload = {
  name: string;
  date_of_birth: string;
  contact: string;
  address?: string | null;
  blood_type: BloodType;
  status?: PatientStatus;
  conditions?: string[];
  allergies?: string[];
};

export type PatientPage = {
  items: Patient[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type Note = {
  id: string;
  patient_id: string;
  content: string;
  timestamp: string;
  created_at: string;
};

export type NoteCreatePayload = {
  content: string;
  timestamp?: string;
};

export type Summary = {
  summary: string;
  source: string;
  note_count: number;
};

export type RecentNote = {
  id: string;
  patient_id: string;
  patient_name: string;
  content: string;
  timestamp: string;
};

export type Dashboard = {
  stats: {
    total_patients: number;
    active_patients: number;
    follow_up_patients: number;
    inactive_patients: number;
    notes_this_week: number;
  };
  recent_notes: RecentNote[];
  activity: number[];
};
