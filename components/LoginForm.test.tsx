import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginForm from "./LoginForm";

const actionState = vi.hoisted(() => ({
  error: null as string | null,
  pending: false,
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [
      { error: actionState.error },
      vi.fn(),
      actionState.pending,
    ],
  };
});

vi.mock("@/app/login/actions", () => ({ login: vi.fn() }));

function renderForm(props?: Partial<{ next: string; defaultShopper: string }>) {
  return render(
    <LoginForm next={props?.next ?? "/"} defaultShopper={props?.defaultShopper ?? ""} />,
  );
}

describe("LoginForm", () => {
  it("labels both fields so they are reachable by name", () => {
    actionState.error = null;
    actionState.pending = false;
    renderForm();

    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    expect(screen.getByLabelText("Household passcode")).toBeInTheDocument();
  });

  it("masks the passcode", () => {
    actionState.error = null;
    renderForm();

    expect(screen.getByLabelText("Household passcode")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("carries the redirect target through the form", () => {
    actionState.error = null;
    const { container } = renderForm({ next: "/history" });

    expect(container.querySelector('input[name="next"]')).toHaveValue(
      "/history",
    );
  });

  it("pre-fills a remembered shopper name", () => {
    actionState.error = null;
    renderForm({ defaultShopper: "Nimal" });

    expect(screen.getByLabelText("Your name")).toHaveValue("Nimal");
  });

  it("announces the error returned by the action", () => {
    actionState.error = "That passcode doesn't match. Try again.";
    renderForm();

    expect(
      screen.getByText("That passcode doesn't match. Try again."),
    ).toBeInTheDocument();
  });

  it("disables submit while the action is running", () => {
    actionState.error = null;
    actionState.pending = true;
    renderForm();

    expect(screen.getByRole("button", { name: "Checking…" })).toBeDisabled();
  });
});
