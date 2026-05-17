import { render, screen, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { RoleSwitcher } from "@/app/layout/RoleSwitcher";
import { useRole } from "@/lib/role";

const reloadSpy = vi.fn();
const originalLocation = window.location;

beforeEach(() => {
  useRole.setState({ role: "staff" });
  reloadSpy.mockReset();
  // jsdom's window.location.reload throws "Not implemented" — replace it
  // with a spy so we can both keep the test green and assert the reload.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, reload: reloadSpy },
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

describe("RoleSwitcher", () => {
  test("renders the current role and toggles the menu", () => {
    render(<RoleSwitcher />);
    const trigger = screen.getByRole("button", { name: /switch role/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(/dr\. anya reeves/i)).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  test("selecting a different role updates the store, closes the menu, and reloads", () => {
    render(<RoleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /switch role/i }));

    const adminOption = screen.getByRole("menuitemradio", {
      name: /administrator/i,
    });
    fireEvent.click(adminOption);

    // Store is updated and menu closes synchronously.
    expect(useRole.getState().role).toBe("admin");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Reload is scheduled on the next tick so persist can flush.
    expect(reloadSpy).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  test("selecting the current role is a no-op (no reload)", () => {
    render(<RoleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /switch role/i }));

    fireEvent.click(
      screen.getByRole("menuitemradio", { name: /clinical staff/i }),
    );
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  test("currently selected option is marked aria-checked", () => {
    useRole.setState({ role: "admin" });
    render(<RoleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /switch role/i }));

    const adminOption = screen.getByRole("menuitemradio", {
      name: /administrator/i,
    });
    const staffOption = screen.getByRole("menuitemradio", {
      name: /clinical staff/i,
    });
    expect(adminOption).toHaveAttribute("aria-checked", "true");
    expect(staffOption).toHaveAttribute("aria-checked", "false");
  });
});
