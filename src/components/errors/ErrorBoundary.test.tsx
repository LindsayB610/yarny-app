import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";

// Component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // Suppress console.error for error boundary tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  it("catches errors and displays error message", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  it("displays custom fallback when provided", () => {
    const fallback = <div>Custom error fallback</div>;

    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom error fallback")).toBeInTheDocument();
  });

  it("shows error details in development mode", () => {
    const originalEnv = import.meta.env.NODE_ENV;
    (import.meta.env as any).NODE_ENV = "development";

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error boundary should log error details in dev mode
    expect(console.error).toHaveBeenCalled();

    (import.meta.env as any).NODE_ENV = originalEnv;
  });

  it("does not show error details in production mode", () => {
    const originalEnv = import.meta.env.NODE_ENV;
    (import.meta.env as any).NODE_ENV = "production";

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText(/componentStack/i)).not.toBeInTheDocument();

    (import.meta.env as any).NODE_ENV = originalEnv;
  });

  it("resets error state when Try again is clicked", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;
    
    const ThrowErrorControlled = () => {
      if (shouldThrow) {
        throw new Error("Test error");
      }
      return <div>No error</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowErrorControlled />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Change shouldThrow to false before clicking try again
    shouldThrow = false;
    const tryAgainButton = screen.getByText(/try again/i);
    await user.click(tryAgainButton);

    // Rerender - error boundary should now render children without error
    rerender(
      <ErrorBoundary>
        <ThrowErrorControlled />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText("No error")).toBeInTheDocument();
    });
  });

  it("handles errors without error message", () => {
    const ThrowErrorWithoutMessage = () => {
      throw new Error();
    };

    render(
      <ErrorBoundary>
        <ThrowErrorWithoutMessage />
      </ErrorBoundary>
    );

    expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
  });
});


