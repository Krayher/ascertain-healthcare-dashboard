import { describe, expect, test } from "vitest";

import { ApiError } from "@/lib/api/client";

describe("ApiError", () => {
  test("carries status + payload", () => {
    const err = new ApiError(422, { detail: "bad" });
    expect(err.status).toBe(422);
    expect((err.payload as { detail: string }).detail).toBe("bad");
    expect(err.message).toBe("API 422");
  });
});
