import { z } from "zod";

const phoneRe = /^\+?[0-9 .()\-]{7,20}$/;

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

const emptyToUndef = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().optional(),
);

export const patientFormSchema = z.object({
  first_name: z.string().min(1, "Required.").max(80, "Too long."),
  last_name: z.string().min(1, "Required.").max(80, "Too long."),
  date_of_birth: z
    .string()
    .min(1, "Required.")
    .refine(
      (s) => !!s && new Date(s) < new Date(),
      "Must be in the past.",
    ),
  phone: z
    .string()
    .min(1, "Required.")
    .regex(phoneRe, "Looks like an invalid phone number."),
  email: emptyToUndef.refine(
    (v) => v === undefined || z.string().email().safeParse(v).success,
    "Must be a valid email.",
  ),
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
