import { describe, expect, test, beforeEach } from "vitest";

import { can, useRole } from "@/lib/role";

beforeEach(() => {
  useRole.setState({ role: "staff" });
});

describe("role permissions", () => {
  test("staff can manage notes but not patients", () => {
    expect(can("staff", "note:create")).toBe(true);
    expect(can("staff", "note:delete")).toBe(true);
    expect(can("staff", "patient:create")).toBe(false);
    expect(can("staff", "patient:edit")).toBe(false);
    expect(can("staff", "patient:delete")).toBe(false);
  });

  test("admin has full CRUD", () => {
    expect(can("admin", "patient:create")).toBe(true);
    expect(can("admin", "patient:edit")).toBe(true);
    expect(can("admin", "patient:delete")).toBe(true);
    expect(can("admin", "note:create")).toBe(true);
    expect(can("admin", "note:delete")).toBe(true);
  });

  test("setRole updates the store", () => {
    expect(useRole.getState().role).toBe("staff");
    useRole.getState().setRole("admin");
    expect(useRole.getState().role).toBe("admin");
  });
});
