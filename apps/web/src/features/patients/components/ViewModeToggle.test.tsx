import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";

import { ViewModeToggle } from "./ViewModeToggle";

import { usePatientViewMode } from "@/features/patients/view-mode";

beforeEach(() => {
  usePatientViewMode.setState({ mode: "table" });
});

describe("ViewModeToggle", () => {
  test("renders both options and marks the current one selected", () => {
    render(<ViewModeToggle />);
    const tableBtn = screen.getByRole("radio", { name: /table view/i });
    const cardsBtn = screen.getByRole("radio", { name: /cards view/i });
    expect(tableBtn).toHaveAttribute("aria-checked", "true");
    expect(cardsBtn).toHaveAttribute("aria-checked", "false");
  });

  test("clicking Cards updates the store", () => {
    render(<ViewModeToggle />);
    fireEvent.click(screen.getByRole("radio", { name: /cards view/i }));
    expect(usePatientViewMode.getState().mode).toBe("cards");
  });
});
