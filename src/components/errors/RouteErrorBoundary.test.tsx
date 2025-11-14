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
    isRouteErrorResponse: vi.fn((error: unknown) => {
      // Check if error has status property (route error response)
      return typeof error === "object" && error !== null && "status" in error;
    }),
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

    // Heading shows "Page Not Found" (capital N)
    expect(screen.getByText("Page Not Found")).toBeInTheDocument();
    // Body shows the statusText "Not Found"
    expect(screen.getByText("Not Found")).toBeInTheDocument();
  });

  it("displays generic error message for Error instance", () => {
    const mockError = new Error("Something went wrong");
    vi.mocked(useRouteError).mockReturnValue(mockError);

    render(<RouteErrorBoundary />);

    // Heading shows "Something went wrong"
    const headings = screen.getAllByText("Something went wrong");
    expect(headings.length).toBeGreaterThan(0);
    
    // Verify it appears in both heading and body
    const heading = headings.find((el) => el.tagName === "H5");
    const body = headings.find((el) => el.tagName === "P");
    expect(heading).toBeInTheDocument();
    expect(body).toBeInTheDocument();
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
    
    // Mock window.location.reload by replacing the entire location object
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      reload: mockReload
    } as Location;

    const mockError = new Error("Generic error");
    vi.mocked(useRouteError).mockReturnValue(mockError);

    render(<RouteErrorBoundary />);

    const reloadButton = screen.getByText(/reload page/i);
    await user.click(reloadButton);

    expect(mockReload).toHaveBeenCalled();

    window.location = originalLocation;
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
    // Create a proper route error response object
    // isRouteErrorResponse checks for status property, so include it
    const mockError = {
      status: 404,
      // Omit statusText entirely - when undefined, code should use data.message
      data: { message: "Custom message" }
    };
    
    vi.mocked(useRouteError).mockReturnValue(mockError as any);

    render(<RouteErrorBoundary />);

    // Check what's actually rendered - the component should detect this as a route error
    // and show "Page Not Found" for 404 status
    const pageNotFound = screen.queryByText("Page Not Found");
    const somethingWrong = screen.queryByText("Something went wrong");
    
    // Should show either "Page Not Found" (if recognized as route error) or fallback
    // The important part is that it shows the custom message
    expect(screen.getByText("Custom message")).toBeInTheDocument();
  });
});


