import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BottomNav, { isActivePath } from "./BottomNav";

const mockPathname = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.value,
}));

describe("isActivePath", () => {
  it("matches the root only exactly", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/history", "/")).toBe(false);
  });

  it("matches a section and its children", () => {
    expect(isActivePath("/log", "/log")).toBe(true);
    expect(isActivePath("/log/new", "/log")).toBe(true);
  });

  it("does not match a different section with a shared prefix", () => {
    expect(isActivePath("/planning", "/plan")).toBe(false);
  });
});

describe("BottomNav", () => {
  it("renders a link for every section", () => {
    mockPathname.value = "/";
    render(<BottomNav />);

    for (const label of ["Month", "Log", "Plan", "History"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("marks only the current section as the current page", () => {
    mockPathname.value = "/plan";
    render(<BottomNav />);

    expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Month" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("labels the nav so screen readers can skip it", () => {
    mockPathname.value = "/";
    render(<BottomNav />);

    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });
});
