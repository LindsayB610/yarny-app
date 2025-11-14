import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { useRouteError } from "react-router-dom";

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useRouteError: vi.fn(),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    )
  };
});

describe("RouteErrorBoundary", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("displays error message for route error response", () => {
    const mockError = {
      status: 404,
      statusText: "Not Found",
      data: { message: "Page not found" }
    };
    vi.mocked(useRouteError).mockReturnValue(mockError as any);

    render(<RouteErrorBoundary />);

    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  it("displays generic error message for Error instance", () => {
    const mockError = new Error("Something went wrong");
    vi.mocked(useRouteError).mockReturnValue(mockError);

    render(<RouteErrorBoundary />);

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("detects chunk load errors", () => {
    const mockError = new Error("Failed to fetch dynamically imported module");
    vi.mocked(useRouteError).mockReturnValue(mockError);

    render(<RouteErrorBoundary />);

    expect(screen.getByText(/we published an update/i)).toBeInTheDocument();
  });

  it("detects ChunkLoadError", () => {
    const mockError = new Error("ChunkLoadError: Loading chunk failed");
    vi.mocked(useRouteError).mockReturnValue(mockError);

    render(<RouteErrorBoundary />);

    expect(screen.getByText(/we published an update/i)).toBeInTheDocument();
  });

  it("automatically reloads on chunk load error", () => {
    const mockReplace = vi.fn();
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: "http://localhost:3000/test",
      replace: mockReplace
    } as any;

    const mockError = new Error("Failed to fetch dynamically imported module");
    vi.mocked(useRouteError).mockReturnValue(mockError);

    render(<RouteErrorBoundary />);

    // Should set reload flag and call replace
    expect(sessionStorage.getItem("yarny_chunk_reload_attempted")).toBe("true");
    expect(mockReplace).toHaveBeenCalled();

    window.location = originalLocation;
  });

  it("does not reload twice for chunk load error", () => {
    sessionStorage.setItem("yarny_chunk_reload_attempted", "true");

    const mockReplace = vi.fn();
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: "http://localhost:3000/test",
      replace: mockReplace
    } as any;

    const mockError = new Error("Failed to fetch dynamically imported module");
    vi.mocked(useRouteError).mockReturnValue(mockError);

    render(<RouteErrorBoundary />);

    // Should not call replace again
    expect(mockReplace).not.toHaveBeenCalled();

    window.location = originalLocation;
  });

  it("handles reload button click for chunk load error", async () => {
    const user = userEvent.setup();
    const mockReplace = vi.fn();
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: "http://localhost:3000/test",
      replace: mockReplace
    } as any;

    const mockError = new Error("Failed to fetch dynamically imported module");
    vi.mocked(useRouteError).mockReturnValue(mockError);

    render(<RouteErrorBoundary />);

    const reloadButton = screen.getByText(/reload page/i);
    await user.click(reloadButton);

    expect(mockReplace).toHaveBeenCalled();
    expect(sessionStorage.getItem("yarny_chunk_reload_attempted")).toBeNull();

    window.location = originalLocation;
  });

  it("handles reload button click for non-chunk errors", async () => {
    const user = userEvent.setup();
    const mockReload = vi.fn();
    const originalReload = window.location.reload;
    window.location.reload = mockReload;

    const mockError = new Error("Generic error");
    vi.mocked(useRouteError).mockReturnValue(mockError);

    render(<RouteErrorBoundary />);

    const reloadButton = screen.getByText(/reload page/i);
    await user.click(reloadButton);

    expect(mockReload).toHaveBeenCalled();

    window.location.reload = originalReload;
  });

  it("displays 500 error correctly", () => {
    const mockError = {
      status: 500,
      statusText: "Internal Server Error"
    };
    vi.mocked(useRouteError).mockReturnValue(mockError as any);

    render(<RouteErrorBoundary />);

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("handles errors without statusText", () => {
    const mockError = {
      status: 404,
      data: { message: "Custom message" }
    };
    vi.mocked(useRouteError).mockReturnValue(mockError as any);

    render(<RouteErrorBoundary />);

    expect(screen.getByText("Custom message")).toBeInTheDocument();
  });
});


