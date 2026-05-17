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

// Same shape as the backend Pydantic validators in apps/api/app/schemas/patient.py.
const PHONE_RE = /\+?\d[\d\s().\-]{6,}/;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
export const MAX_CONDITIONS_OR_ALLERGIES = 50;
export const MAX_CONDITION_OR_ALLERGY_LEN = 80;

const entriesSchema = z
  .array(z.string())
  .max(
    MAX_CONDITIONS_OR_ALLERGIES,
    `At most ${MAX_CONDITIONS_OR_ALLERGIES} entries allowed.`,
  )
  .superRefine((arr, ctx) => {
    arr.forEach((raw, i) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [i],
          message: "Entries must not be empty.",
        });
        return;
      }
      if (trimmed.length > MAX_CONDITION_OR_ALLERGY_LEN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [i],
          message: `Each entry must be at most ${MAX_CONDITION_OR_ALLERGY_LEN} characters.`,
        });
      }
    });
  })
  .default([]);

export const patientFormSchema = z.object({
  name: z.string().min(1, "Required.").max(160, "Too long."),
  date_of_birth: z
    .string()
    .min(1, "Required.")
    .refine(
      (s) => !!s && new Date(s) < new Date(),
      "Must be in the past.",
    ),
  contact: z
    .string()
    .min(1, "Required.")
    .max(200, "Too long.")
    .refine(
      (s) => PHONE_RE.test(s) || EMAIL_RE.test(s),
      "Must include a phone number or email address.",
    ),
  address: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().max(240, "Too long.").optional(),
  ),
  blood_type: z.enum(BLOOD_TYPES, { message: "Pick a blood type." }),
  status: z.enum(STATUSES).default("active"),
  conditions: entriesSchema,
  allergies: entriesSchema,
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
