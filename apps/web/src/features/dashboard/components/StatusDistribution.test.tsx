import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { StatusDistribution } from "./StatusDistribution";

describe("StatusDistribution", () => {
  test("renders empty state when total is 0", () => {
    render(<StatusDistribution active={0} followUp={0} inactive={0} />);
    expect(screen.getByText(/no patients yet/i)).toBeInTheDocument();
  });

  test("renders counts and percentages", () => {
    render(<StatusDistribution active={6} followUp={3} inactive={1} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Follow-up")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText(/· 60%/)).toBeInTheDocument();
    expect(screen.getByText(/· 30%/)).toBeInTheDocument();
    expect(screen.getByText(/· 10%/)).toBeInTheDocument();
  });

  test("a11y label summarizes the distribution", () => {
    render(<StatusDistribution active={2} followUp={1} inactive={0} />);
    const bar = screen.getByRole("img");
    expect(bar).toHaveAttribute(
      "aria-label",
      "Status distribution: 2 active, 1 follow-up, 0 inactive",
    );
  });
});
