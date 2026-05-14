import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { FilterRow } from "./FilterRow";

describe("FilterRow", () => {
  test("debounces search changes", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<FilterRow search="" status="" onChange={onChange} />);

    const input = screen.getByLabelText("Search patients");
    fireEvent.change(input, { target: { value: "marisol" } });

    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(260);
    });
    expect(onChange).toHaveBeenCalledWith({ search: "marisol", status: "" });
    vi.useRealTimers();
  });

  test("status pill click fires onChange immediately", () => {
    const onChange = vi.fn();
    render(<FilterRow search="" status="" onChange={onChange} />);
    fireEvent.click(screen.getByText("Follow-up"));
    expect(onChange).toHaveBeenCalledWith({ search: "", status: "follow_up" });
  });
});
