import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "./EmptyState";
import PageHeader from "./PageHeader";

describe("EmptyState", () => {
  it("shows the title and body", () => {
    render(<EmptyState title="Nothing yet" body="Log a trip to begin." />);

    expect(
      screen.getByRole("heading", { name: "Nothing yet" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Log a trip to begin.")).toBeInTheDocument();
  });

  it("renders the call to action when given one", () => {
    render(
      <EmptyState
        title="Nothing yet"
        body="Log a trip to begin."
        actionLabel="Log a trip"
        actionHref="/log"
      />,
    );

    expect(screen.getByRole("link", { name: "Log a trip" })).toHaveAttribute(
      "href",
      "/log",
    );
  });

  it("omits the action when no href is given", () => {
    render(<EmptyState title="Nothing yet" body="Log a trip to begin." />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("PageHeader", () => {
  it("renders the title as the page heading", () => {
    render(<PageHeader title="August 2026" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "August 2026" }),
    ).toBeInTheDocument();
  });

  it("renders the subtitle when provided", () => {
    render(<PageHeader title="August 2026" subtitle="This month so far" />);

    expect(screen.getByText("This month so far")).toBeInTheDocument();
  });

  it("renders an action slot", () => {
    render(<PageHeader title="History" action={<button>Export</button>} />);

    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });
});
