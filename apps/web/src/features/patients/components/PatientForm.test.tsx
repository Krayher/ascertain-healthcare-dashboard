import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ApiError } from "@/lib/api/client";

import { PatientForm } from "./PatientForm";

function fill(form: HTMLElement, values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement | null;
    if (input) fireEvent.change(input, { target: { value } });
  }
}

describe("PatientForm", () => {
  test("blocks submit when required fields are empty", async () => {
    const onSubmit = vi.fn();
    const { container } = render(<PatientForm onSubmit={onSubmit} />);
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("submits with valid values", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<PatientForm onSubmit={onSubmit} />);
    const form = container.querySelector("form")!;
    fill(form, {
      name: "Test Patient",
      date_of_birth: "1990-01-01",
      contact: "+14155550000",
    });
    fireEvent.submit(form);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.name).toBe("Test Patient");
    expect(submitted.contact).toBe("+14155550000");
  });

  test("blocks submit when contact has no phone or email", async () => {
    const onSubmit = vi.fn();
    const { container } = render(<PatientForm onSubmit={onSubmit} />);
    const form = container.querySelector("form")!;
    fill(form, {
      name: "Test Patient",
      date_of_birth: "1990-01-01",
      contact: "please call me",
    });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(
        screen.getByText(/must include a phone number or email address/i),
      ).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("maps server 422 errors to fields", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new ApiError(422, {
          detail: [{ loc: ["body", "contact"], msg: "Server says no." }],
        }),
      );
    const user = userEvent.setup();
    const { container } = render(<PatientForm onSubmit={onSubmit} />);
    const form = container.querySelector("form")!;
    fill(form, {
      name: "Test Patient",
      date_of_birth: "1990-01-01",
      contact: "+14155550000",
    });
    await user.click(screen.getByRole("button", { name: /create patient/i }));
    await waitFor(() => {
      expect(screen.getByText("Server says no.")).toBeInTheDocument();
    });
  });
});
