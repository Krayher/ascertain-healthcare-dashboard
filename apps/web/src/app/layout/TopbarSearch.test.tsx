import { render, screen, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { TopbarSearch } from "./TopbarSearch";

function LocationProbe() {
  const loc = useLocation();
  return (
    <div data-testid="loc">
      {loc.pathname}
      {loc.search}
    </div>
  );
}

function renderAt(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <TopbarSearch />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TopbarSearch", () => {
  test("debounces input then navigates to /patients?search=...", () => {
    renderAt("/");
    const input = screen.getByLabelText("Search patients");

    fireEvent.change(input, { target: { value: "marisol" } });
    // Nothing yet — still inside debounce window.
    expect(screen.getByTestId("loc").textContent).toBe("/");

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(screen.getByTestId("loc").textContent).toBe(
      "/patients?search=marisol&page=1",
    );
  });

  test("submitting the form flushes immediately (no debounce wait)", () => {
    renderAt("/");
    const input = screen.getByLabelText("Search patients") as HTMLInputElement;
    const form = input.closest("form")!;

    fireEvent.change(input, { target: { value: "asha" } });
    fireEvent.submit(form);

    // Note: no advanceTimers — submit committed synchronously.
    expect(screen.getByTestId("loc").textContent).toBe(
      "/patients?search=asha&page=1",
    );
  });

  test("mirrors URL search when already on /patients", () => {
    renderAt("/patients?search=existing");
    const input = screen.getByLabelText("Search patients") as HTMLInputElement;
    expect(input.value).toBe("existing");
  });

  test("Escape clears the input without re-triggering navigation", () => {
    renderAt("/patients?search=existing");
    const input = screen.getByLabelText("Search patients") as HTMLInputElement;

    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");

    act(() => {
      vi.advanceTimersByTime(260);
    });
    // Empty value drops the search param.
    expect(screen.getByTestId("loc").textContent).toBe("/patients?page=1");
  });

  test("clear button (X) resets the value and refocuses", () => {
    renderAt("/patients?search=hello");
    fireEvent.click(screen.getByLabelText("Clear search"));
    expect(
      (screen.getByLabelText("Search patients") as HTMLInputElement).value,
    ).toBe("");
  });

  test("Cmd/Ctrl+K focuses the input", () => {
    renderAt("/");
    const input = screen.getByLabelText("Search patients");
    // Element starts unfocused.
    expect(document.activeElement).not.toBe(input);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(document.activeElement).toBe(input);
  });
});
