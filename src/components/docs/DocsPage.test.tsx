import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DocsPage } from "./DocsPage";
import { useAuth } from "../../hooks/useAuth";
import { useUptimeStatus } from "../../hooks/useUptimeStatus";

// Mock hooks
vi.mock("../../hooks/useAuth");
vi.mock("../../hooks/useUptimeStatus");

const renderWithProviders = (ui: React.ReactElement, initialEntries = ["/docs"]) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/docs/:category?" element={ui} />
          <Route path="/docs" element={ui} />
        </Routes>
      </MemoryRouter>
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
    
    // Check for Yarny wordmark image and User Guide text in header
    expect(screen.getByAltText("Yarny")).toBeInTheDocument();
    // "User Guide" appears in header (h5) and footer (link), so check for header specifically
    const userGuideHeaders = screen.getAllByText("User Guide");
    expect(userGuideHeaders.length).toBeGreaterThan(0);
    // Verify at least one is in an h5 (header)
    const headerUserGuide = userGuideHeaders.find(
      (el) => el.tagName === "H5"
    );
    expect(headerUserGuide).toBeInTheDocument();
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
      "Characters & Worldbuilding",
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

  it("verifies static file links point to existing files", () => {
    renderWithProviders(<DocsPage />);
    
    // Get all links that point to static files (not routes or mailto links)
    const allLinks = screen.getAllByRole("link");
    const staticFileLinks = allLinks.filter((link) => {
      const href = link.getAttribute("href");
      return (
        href &&
        href.startsWith("/") &&
        !href.startsWith("mailto:") &&
        href.endsWith(".html")
      );
    });
    
    expect(staticFileLinks.length).toBeGreaterThan(0);
    
    staticFileLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (href) {
        // Remove leading slash and check if file exists in public directory
        const filePath = href.startsWith("/") ? href.slice(1) : href;
        const publicPath = resolve(process.cwd(), "public", filePath);
        expect(existsSync(publicPath)).toBe(true);
      }
    });
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
    // Navigate to writing category to see genres section
    renderWithProviders(<DocsPage />, ["/docs/writing"]);
    
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
    // Navigate to getting-started category to see those sections
    renderWithProviders(<DocsPage />, ["/docs/getting-started"]);
    
    // Check that sections are rendered - look for section IDs in the DOM
    // Sections have IDs like "getting-started", "stories-dashboard", etc.
    const gettingStartedSection = document.getElementById("getting-started");
    expect(gettingStartedSection).toBeInTheDocument();
    
    const storiesDashboardSection = document.getElementById("stories-dashboard");
    expect(storiesDashboardSection).toBeInTheDocument();
  });

  it("shows overview page when no category is selected", () => {
    renderWithProviders(<DocsPage />, ["/docs"]);
    
    // Should show category cards on overview page
    // Check for h3 heading specifically (not the h5 in header or footer link)
    const userGuideHeading = screen.getByRole("heading", { level: 3, name: "User Guide" });
    expect(userGuideHeading).toBeInTheDocument();
    expect(screen.getByText(/Welcome to the Yarny User Guide/i)).toBeInTheDocument();
    
    // Check that category cards are present (text appears in multiple places, use getAllByText)
    const overviewElements = screen.getAllByText("Overview");
    expect(overviewElements.length).toBeGreaterThan(0);
    
    const writingElements = screen.getAllByText("Writing Workflow");
    expect(writingElements.length).toBeGreaterThan(0);
    
    // Check for category card links
    const overviewLink = screen.getByRole("link", { name: /Overview/i });
    expect(overviewLink).toHaveAttribute("href", "/docs/getting-started");
  });
});

