import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { FilterRow, type Filters } from "./FilterRow";

const empty: Filters = {
  search: "",
  status: "",
  bloodType: "",
  condition: "",
  ageMin: "",
  ageMax: "",
};

describe("FilterRow", () => {
  test("debounces search changes", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<FilterRow value={empty} onChange={onChange} />);

    const input = screen.getByLabelText("Search patients");
    fireEvent.change(input, { target: { value: "marisol" } });

    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(260);
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: "marisol" }),
    );
    vi.useRealTimers();
  });

  test("status pill click fires onChange immediately", () => {
    const onChange = vi.fn();
    render(<FilterRow value={empty} onChange={onChange} />);
    fireEvent.click(screen.getByText("Follow-up"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: "follow_up" }),
    );
  });

  test("advanced filters reveal blood type and age inputs", () => {
    const onChange = vi.fn();
    render(<FilterRow value={empty} onChange={onChange} />);
    fireEvent.click(screen.getByText("+ Advanced"));
    expect(screen.getByLabelText("Filter by blood type")).toBeInTheDocument();
    expect(screen.getByLabelText("Minimum age")).toBeInTheDocument();
    expect(screen.getByLabelText("Maximum age")).toBeInTheDocument();
  });

  test("advanced section is open by default if any advanced filter is set", () => {
    const onChange = vi.fn();
    render(
      <FilterRow value={{ ...empty, bloodType: "A+" }} onChange={onChange} />,
    );
    expect(screen.getByLabelText("Filter by blood type")).toBeInTheDocument();
  });
});
