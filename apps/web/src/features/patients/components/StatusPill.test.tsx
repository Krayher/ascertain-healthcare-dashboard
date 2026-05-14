import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { StatusPill } from "./StatusPill";

describe("StatusPill", () => {
  test("renders human label for known status", () => {
    render(<StatusPill status="follow_up" />);
    expect(screen.getByText("Follow-up")).toBeInTheDocument();
  });

  test("falls back to raw value for unknown status", () => {
    render(<StatusPill status="unknown_value" />);
    expect(screen.getByText("unknown_value")).toBeInTheDocument();
  });
});
