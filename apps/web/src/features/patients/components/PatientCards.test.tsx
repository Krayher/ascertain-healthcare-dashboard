import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { PatientCards } from "./PatientCards";

import type { Patient } from "@/lib/api/client";

function fixture(over: Partial<Patient> = {}): Patient {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Marisol Ortega",
    date_of_birth: "1971-08-04",
    contact: "+14155550142",
    address: null,
    blood_type: "O+",
    status: "active",
    conditions: ["Hypertension", "Type 2 diabetes"],
    allergies: [],
    last_visit: "2026-05-01T12:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    age: 54,
    mrn: "MRN-ABCDE",
    ...over,
  };
}

describe("PatientCards", () => {
  test("renders one card per row with key details", () => {
    render(<PatientCards rows={[fixture()]} onRowClick={() => {}} />);
    expect(screen.getByText("Marisol Ortega")).toBeInTheDocument();
    expect(screen.getByText(/MRN-ABCDE/)).toBeInTheDocument();
    expect(screen.getByText("Hypertension")).toBeInTheDocument();
    expect(screen.getByText("54")).toBeInTheDocument();
  });

  test("invokes onRowClick with the patient id", () => {
    const onRowClick = vi.fn();
    render(<PatientCards rows={[fixture()]} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText("Marisol Ortega"));
    expect(onRowClick).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
    );
  });

  test("collapses excess conditions into a +N badge", () => {
    const rows = [
      fixture({
        conditions: ["A", "B", "C", "D", "E"],
      }),
    ];
    render(<PatientCards rows={rows} onRowClick={() => {}} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  test("shows 'none recorded' when conditions array is empty", () => {
    render(
      <PatientCards rows={[fixture({ conditions: [] })]} onRowClick={() => {}} />,
    );
    expect(screen.getByText(/none recorded/i)).toBeInTheDocument();
  });
});
