import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DocsPage } from "./DocsPage";
import { useAuth } from "../../hooks/useAuth";
import { useUptimeStatus } from "../../hooks/useUptimeStatus";

// Mock hooks
vi.mock("../../hooks/useAuth");
vi.mock("../../hooks/useUptimeStatus");

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe("DocsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        email: "test@example.com",
        token: "test-token"
      },
      login: vi.fn(),
      loginWithBypass: vi.fn(),
      logout: vi.fn()
    });

    vi.mocked(useUptimeStatus).mockReturnValue({
      status: "operational",
      label: "All systems operational",
      isLoading: false
    });
  });

  it("renders the page title", () => {
    renderWithProviders(<DocsPage />);
    
    expect(screen.getByText("Yarny User Guide")).toBeInTheDocument();
  });

  it("displays the alpha warning banner", () => {
    renderWithProviders(<DocsPage />);
    
    expect(
      screen.getByText(/Yarny is currently in alpha/i)
    ).toBeInTheDocument();
  });

  it("shows navigation drawer on desktop", () => {
    renderWithProviders(<DocsPage />);
    
    // Check for section navigation items (use getAllByText since text appears in nav and content)
    const gettingStarted = screen.getAllByText("Getting Started");
    expect(gettingStarted.length).toBeGreaterThan(0);
    
    const managingStories = screen.getAllByText("Managing Stories");
    expect(managingStories.length).toBeGreaterThan(0);
  });

  it("displays all main documentation sections", () => {
    renderWithProviders(<DocsPage />);
    
    const sections = [
      "Getting Started",
      "Managing Stories",
      "Story Genres",
      "Writing in the Editor",
      "People, Places, and Things",
      "Word Count & Goals",
      "Exporting & Backups",
      "Google Drive Integration",
      "Offline & Sync Health",
      "Troubleshooting",
      "Tips & Best Practices",
      "Support & Feedback"
    ];

    sections.forEach((section) => {
      // Text appears in both nav and content, so use getAllByText
      const elements = screen.getAllByText(section);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it("shows Back to Stories button when authenticated", () => {
    renderWithProviders(<DocsPage />);
    
    expect(screen.getByRole("link", { name: /back to stories/i })).toBeInTheDocument();
  });

  it("shows Back to Sign In button when not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      login: vi.fn(),
      loginWithBypass: vi.fn(),
      logout: vi.fn()
    });

    renderWithProviders(<DocsPage />);
    
    expect(screen.getByRole("link", { name: /back to sign in/i })).toBeInTheDocument();
  });

  it("displays footer with copyright and links", () => {
    renderWithProviders(<DocsPage />);
    
    expect(screen.getByText(/© \d{4} Yarny/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "User Guide" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Testing Workbook" })).toBeInTheDocument();
  });

  it("shows My Stories link in footer when authenticated", () => {
    renderWithProviders(<DocsPage />);
    
    expect(screen.getByRole("link", { name: "My Stories" })).toBeInTheDocument();
  });

  it("shows Back to Login link in footer when not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      login: vi.fn(),
      loginWithBypass: vi.fn(),
      logout: vi.fn()
    });

    renderWithProviders(<DocsPage />);
    
    expect(screen.getByRole("link", { name: "Back to Login" })).toBeInTheDocument();
  });

  it("displays uptime status when available", () => {
    vi.mocked(useUptimeStatus).mockReturnValue({
      status: "operational",
      label: "All systems operational",
      isLoading: false
    });

    renderWithProviders(<DocsPage />);
    
    expect(screen.getByText("All systems operational")).toBeInTheDocument();
  });

  it("handles mobile menu toggle", async () => {
    const user = userEvent.setup();
    
    // Mock mobile viewport
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === "(max-width: 899px)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });

    renderWithProviders(<DocsPage />);
    
    // Find and click the menu button
    const menuButton = screen.getByLabelText(/open navigation menu/i);
    expect(menuButton).toBeInTheDocument();
    
    await user.click(menuButton);
    
    // Menu should be open - check that navigation drawer is present
    // The drawer should contain navigation items
    await waitFor(() => {
      // Check for nav structure instead of specific text
      const nav = screen.getByLabelText("Documentation sections");
      expect(nav).toBeInTheDocument();
    });
  });

  it("renders genre descriptions", () => {
    renderWithProviders(<DocsPage />);
    
    // Check for some genre names (may appear multiple times)
    const literaryFiction = screen.getAllByText("Literary Fiction");
    expect(literaryFiction.length).toBeGreaterThan(0);
    
    const scienceFiction = screen.getAllByText("Science Fiction");
    expect(scienceFiction.length).toBeGreaterThan(0);
    
    const fantasy = screen.getAllByText("Fantasy");
    expect(fantasy.length).toBeGreaterThan(0);
  });

  it("displays Storage Settings link when authenticated", () => {
    renderWithProviders(<DocsPage />);
    
    expect(screen.getByRole("link", { name: /storage settings/i })).toBeInTheDocument();
  });

  it("has accessible navigation structure", () => {
    renderWithProviders(<DocsPage />);
    
    // Check for proper ARIA labels
    const nav = screen.getByLabelText("Documentation sections");
    expect(nav).toBeInTheDocument();
    
    const footerNav = screen.getByLabelText("Footer navigation");
    expect(footerNav).toBeInTheDocument();
  });

  it("renders section papers with proper structure", () => {
    renderWithProviders(<DocsPage />);
    
    // Check that sections are rendered - look for section IDs in the DOM
    // Sections have IDs like "getting-started", "stories-dashboard", etc.
    const gettingStartedSection = document.getElementById("getting-started");
    expect(gettingStartedSection).toBeInTheDocument();
    
    const storiesDashboardSection = document.getElementById("stories-dashboard");
    expect(storiesDashboardSection).toBeInTheDocument();
  });
});

