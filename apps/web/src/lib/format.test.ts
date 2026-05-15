import { describe, expect, test } from "vitest";

import { formatDate, initials } from "@/lib/format";

describe("format", () => {
  test("initials handles short names", () => {
    expect(initials("Marisol Ortega")).toBe("MO");
    expect(initials("Cher")).toBe("C");
    expect(initials("")).toBe("");
  });

  test("formatDate handles nullish", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  test("formatDate renders a real date", () => {
    expect(formatDate("2026-05-14T10:00:00Z")).toMatch(/2026/);
  });
});
