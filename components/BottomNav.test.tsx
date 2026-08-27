import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type Link from "next/link";
import BottomNav, { isActivePath } from "./BottomNav";

const mockPathname = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.value,
}));

/** `prefetch` never reaches the DOM, and it is the whole reason a tab renders
 *  the moment it is tapped — so the stand-in puts it somewhere assertable. */
vi.mock("next/link", () => ({
  default: ({ href, prefetch, children, ...rest }: ComponentProps<typeof Link>) => (
    <a href={String(href)} data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
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

  it("prefetches every tab, URL included, before it is tapped", () => {
    mockPathname.value = "/";
    render(<BottomNav />);

    for (const label of ["Month", "Log", "Plan", "History"]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "data-prefetch",
        "true",
      );
    }
  });

  it("labels the nav so screen readers can skip it", () => {
    mockPathname.value = "/";
    render(<BottomNav />);

    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });
});
