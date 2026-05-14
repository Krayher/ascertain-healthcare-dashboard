import { act } from "react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { applyTheme, useTheme } from "@/lib/theme";

describe("theme store", () => {
  beforeEach(() => {
    localStorage.clear();
    useTheme.setState({ theme: "light" });
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  test("toggle flips theme and persists", () => {
    act(() => {
      useTheme.getState().toggle();
    });
    expect(useTheme.getState().theme).toBe("dark");
    const stored = JSON.parse(localStorage.getItem("ascertain-theme") ?? "{}");
    expect(stored.state.theme).toBe("dark");
  });

  test("applyTheme writes data-theme to document", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    applyTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
