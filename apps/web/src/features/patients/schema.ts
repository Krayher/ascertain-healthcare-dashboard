import { z } from "zod";

export const BLOOD_TYPES = [
  "O+",
  "O-",
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
] as const;

export const STATUSES = ["active", "follow_up", "inactive"] as const;

export const patientFormSchema = z.object({
  name: z.string().min(1, "Required.").max(160, "Too long."),
  date_of_birth: z
    .string()
    .min(1, "Required.")
    .refine(
      (s) => !!s && new Date(s) < new Date(),
      "Must be in the past.",
    ),
  contact: z.string().min(1, "Required.").max(200, "Too long."),
  address: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().max(240, "Too long.").optional(),
  ),
  blood_type: z.enum(BLOOD_TYPES, { message: "Pick a blood type." }),
  status: z.enum(STATUSES).default("active"),
  conditions: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

export function csvToList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function listToCsv(values: string[] | undefined): string {
  return (values ?? []).join(", ");
}
