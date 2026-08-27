import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOffline } from "next/offline";

import OfflineBanner from "./OfflineBanner";

vi.mock("next/offline", () => ({ useOffline: vi.fn() }));

const mockedUseOffline = vi.mocked(useOffline);

describe("OfflineBanner", () => {
  beforeEach(() => {
    mockedUseOffline.mockReset();
  });

  it("stays out of the way while the connection is up", () => {
    mockedUseOffline.mockReturnValue(false);
    render(<OfflineBanner />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("says the app is offline when the connection drops", () => {
    mockedUseOffline.mockReturnValue(true);
    render(<OfflineBanner />);

    expect(screen.getByRole("status")).toHaveTextContent(/you.re offline/i);
  });

  it("closes itself once the connection is back", () => {
    mockedUseOffline.mockReturnValue(true);
    const { rerender } = render(<OfflineBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    mockedUseOffline.mockReturnValue(false);
    rerender(<OfflineBanner />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not swallow taps meant for the page underneath", () => {
    mockedUseOffline.mockReturnValue(true);
    render(<OfflineBanner />);

    expect(screen.getByRole("status")).toHaveClass("pointer-events-none");
  });
});
