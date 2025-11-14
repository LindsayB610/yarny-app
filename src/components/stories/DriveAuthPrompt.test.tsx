import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/utils/test-utils";
import { DriveAuthPrompt } from "./DriveAuthPrompt";

describe("DriveAuthPrompt", () => {
  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = {
      href: "http://localhost:3000"
    } as any;
  });

  it("renders connect to Drive message", () => {
    renderWithProviders(<DriveAuthPrompt />);

    expect(screen.getByText(/connect to google drive/i)).toBeInTheDocument();
    expect(screen.getByText(/to create and manage stories/i)).toBeInTheDocument();
  });

  it("redirects to Drive auth endpoint when button is clicked", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;

    delete (window as any).location;
    window.location = {
      href: "http://localhost:3000"
    } as any;

    renderWithProviders(<DriveAuthPrompt />);

    const button = screen.getByText(/connect to drive/i);
    await user.click(button);

    expect(window.location.href).toBe("/.netlify/functions/drive-auth");

    window.location = originalLocation;
  });
});


