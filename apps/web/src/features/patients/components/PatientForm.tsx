import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  BLOOD_TYPES,
  STATUSES,
  csvToList,
  listToCsv,
  patientFormSchema,
  type PatientFormValues,
} from "@/features/patients/schema";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";

type Props = {
  initial?: Partial<PatientFormValues>;
  submitLabel?: string;
  pending?: boolean;
  onCancel?: () => void;
  onSubmit: (values: PatientFormValues) => Promise<void>;
};

export function PatientForm({
  initial,
  submitLabel = "Create patient",
  pending,
  onCancel,
  onSubmit,
}: Props) {
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      date_of_birth: "",
      contact: "",
      address: "",
      blood_type: "O+",
      status: "active",
      conditions: [],
      allergies: [],
      ...initial,
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const { register, handleSubmit, formState, setError } = form;

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const payload = err.payload as { detail?: { loc: string[]; msg: string }[] };
        const details = payload?.detail ?? [];
        let mapped = 0;
        for (const issue of details) {
          const field = issue.loc?.[issue.loc.length - 1];
          if (field && field !== "body") {
            setError(field as keyof PatientFormValues, {
              type: "server",
              message: issue.msg,
            });
            mapped++;
          }
        }
        if (mapped === 0) {
          setError("root.server", {
            type: "server",
            message: "Server rejected the request.",
          });
        }
        return;
      }
      setError("root.network", {
        type: "network",
        message:
          (err as Error)?.message ?? "Network error — please try again.",
      });
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <Section
        title="Personal"
        subtitle="Identifiers used across the chart, notes, and future communications."
      >
        <Field label="Name" required full error={formState.errors.name?.message}>
          <Input {...register("name")} error={!!formState.errors.name} />
        </Field>
        <Field
          label="Date of birth"
          required
          error={formState.errors.date_of_birth?.message}
        >
          <Input
            type="date"
            {...register("date_of_birth")}
            error={!!formState.errors.date_of_birth}
          />
        </Field>
        <Field label="Contact" required error={formState.errors.contact?.message}>
          <Input
            {...register("contact")}
            placeholder="+14155550142 | name@example.com"
            error={!!formState.errors.contact}
          />
        </Field>
        <Field label="Address" full error={formState.errors.address?.message}>
          <Input
            {...register("address")}
            error={!!formState.errors.address}
          />
        </Field>
      </Section>

      <Section
        title="Medical"
        subtitle="Surfaced prominently across the chart."
      >
        <Field label="Blood type" error={formState.errors.blood_type?.message}>
          <Select {...register("blood_type")}>
            {BLOOD_TYPES.map((bt) => (
              <option key={bt} value={bt}>
                {bt}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" error={formState.errors.status?.message}>
          <Select {...register("status")}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Conditions · comma-separated"
          full
          error={conditionsError(formState.errors.conditions)}
        >
          <Input
            defaultValue={listToCsv(initial?.conditions)}
            onChange={(e) =>
              form.setValue("conditions", csvToList(e.target.value), {
                shouldValidate: true,
              })
            }
            placeholder="Hypertension, Type 2 diabetes"
          />
        </Field>
        <Field
          label="Allergies · comma-separated"
          full
          error={conditionsError(formState.errors.allergies)}
        >
          <Input
            defaultValue={listToCsv(initial?.allergies)}
            onChange={(e) =>
              form.setValue("allergies", csvToList(e.target.value), {
                shouldValidate: true,
              })
            }
            placeholder="Sulfa drugs"
          />
        </Field>
      </Section>

      {(formState.errors.root?.server || formState.errors.root?.network) && (
        <div className="mx-4 mt-1 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger md:mx-8">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formState.errors.root?.network?.message ??
            formState.errors.root?.server?.message}
        </div>
      )}

      <div className="mt-2 flex flex-col-reverse gap-2 border-t border-border px-4 py-4 sm:flex-row sm:justify-end sm:gap-2.5 md:px-8">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 border-b border-border px-4 py-5 md:grid-cols-[220px_1fr] md:gap-8 md:px-8 md:py-6">
      <div>
        <h3 className="m-0 text-lg font-semibold leading-tight tracking-tight">
          {title}
        </h3>
        <p className="mt-1 text-[13px] text-fg-muted">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

// Surface either an array-level error (e.g. "At most 50 entries") or the
// first per-element error from a `superRefine`-driven list field.
function conditionsError(err: unknown): string | undefined {
  if (!err) return undefined;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  if (Array.isArray(err)) {
    for (const item of err) {
      if (item && typeof item.message === "string") return item.message;
    }
  }
  return undefined;
}

function Field({
  label,
  required,
  error,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(full && "col-span-2")}>
      <label className="mb-1.5 block text-[12.5px] text-fg-muted">
        {label}
        {required && <span className="ml-0.5 text-danger">·</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-danger" role="alert">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
