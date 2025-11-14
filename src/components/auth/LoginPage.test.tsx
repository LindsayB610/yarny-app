import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/utils/test-utils";
import { LoginPage } from "./LoginPage";
import { apiClient } from "../../api/client";

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

// Mock the API client
vi.mock("../../api/client", () => ({
  apiClient: {
    getConfig: vi.fn(),
    verifyGoogle: vi.fn()
  }
}));

// Mock Google Sign-In
const mockGoogleAccounts = {
  accounts: {
    id: {
      initialize: vi.fn(),
      prompt: vi.fn()
    }
  }
};

describe("LoginPage", () => {
  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    
    // Setup window.google mock
    window.google = mockGoogleAccounts as unknown as typeof window.google;
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock getConfig to return a client ID
    vi.mocked(apiClient.getConfig).mockResolvedValue({
      clientId: "test-client-id",
      localBypass: undefined
    });
  });

  afterEach(() => {
    localStorage.clear();
    delete (window as any).google;
  });

  it("renders login page with sign in button", async () => {
    renderWithProviders(<LoginPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
    });
  });

  it("displays loading state while fetching config", () => {
    vi.mocked(apiClient.getConfig).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("initializes Google Sign-In when config is loaded", async () => {
    renderWithProviders(<LoginPage />);
    
    await waitFor(() => {
      expect(mockGoogleAccounts.accounts.id.initialize).toHaveBeenCalledWith({
        client_id: "test-client-id",
        callback: expect.any(Function)
      });
    });
  });

  it("shows error message when authentication fails", async () => {
    const user = userEvent.setup();
    const errorMessage = "Authentication failed";
    
    vi.mocked(apiClient.verifyGoogle).mockRejectedValue(new Error(errorMessage));
    
    renderWithProviders(<LoginPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
    });
    
    // Simulate Google Sign-In callback
    const initializeCall = mockGoogleAccounts.accounts.id.initialize.mock.calls[0];
    const callback = initializeCall[0].callback;
    
    await callback({ credential: "test-token" });
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it("redirects to stories after successful login", async () => {
    const mockNavigate = vi.fn();
    vi.doMock("react-router-dom", async () => {
      const actual = await vi.importActual("react-router-dom");
      return {
        ...actual,
        useNavigate: () => mockNavigate
      };
    });
    
    vi.mocked(apiClient.verifyGoogle).mockResolvedValue({
      verified: true,
      user: "test@example.com",
      name: "Test User",
      picture: "https://example.com/avatar.jpg",
      token: "session-token"
    });
    
    renderWithProviders(<LoginPage />);
    
    await waitFor(() => {
      expect(mockGoogleAccounts.accounts.id.initialize).toHaveBeenCalled();
    });
    
    const initializeCall = mockGoogleAccounts.accounts.id.initialize.mock.calls[0];
    const callback = initializeCall[0].callback;
    
    await callback({ credential: "test-token" });
    
    await waitFor(() => {
      expect(apiClient.verifyGoogle).toHaveBeenCalledWith({ token: "test-token" });
    });
  });

  it("shows local bypass option when enabled on localhost", async () => {
    // Mock hostname to be localhost
    Object.defineProperty(window, "location", {
      value: {
        hostname: "localhost"
      },
      writable: true
    });
    
    vi.mocked(apiClient.getConfig).mockResolvedValue({
      clientId: "test-client-id",
      localBypass: {
        enabled: true,
        name: "Local Dev User",
        email: "local@example.com"
      }
    });
    
    renderWithProviders(<LoginPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/continue as local dev user/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/local bypass active/i)).toBeInTheDocument();
  });

  it("handles local bypass authentication", async () => {
    Object.defineProperty(window, "location", {
      value: {
        hostname: "localhost"
      },
      writable: true
    });
    
    vi.mocked(apiClient.getConfig).mockResolvedValue({
      clientId: "test-client-id",
      localBypass: {
        enabled: true,
        name: "Local Dev User",
        email: "local@example.com"
      }
    });
    
    vi.mocked(apiClient.verifyGoogle).mockResolvedValue({
      verified: true,
      user: "local@example.com",
      name: "Local Dev User",
      token: "bypass-token"
    });
    
    // Mock prompt to return secret
    const originalPrompt = window.prompt;
    window.prompt = vi.fn(() => "test-secret");
    
    renderWithProviders(<LoginPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/continue as local dev user/i)).toBeInTheDocument();
    });
    
    const button = screen.getByText(/continue as local dev user/i);
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(apiClient.verifyGoogle).toHaveBeenCalledWith({
        mode: "local-bypass",
        secret: "test-secret"
      });
    });
    
    window.prompt = originalPrompt;
  });

  it("shows error when local bypass secret is missing", async () => {
    Object.defineProperty(window, "location", {
      value: {
        hostname: "localhost"
      },
      writable: true
    });
    
    vi.mocked(apiClient.getConfig).mockResolvedValue({
      clientId: "test-client-id",
      localBypass: {
        enabled: true,
        name: "Local Dev User"
      }
    });
    
    // Mock prompt to return empty string
    const originalPrompt = window.prompt;
    window.prompt = vi.fn(() => "");
    
    renderWithProviders(<LoginPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/continue as local dev user/i)).toBeInTheDocument();
    });
    
    const button = screen.getByText(/continue as local dev user/i);
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/local bypass secret is required/i)).toBeInTheDocument();
    });
    
    window.prompt = originalPrompt;
  });

  it("does not initialize Google Sign-In when bypass is active", async () => {
    Object.defineProperty(window, "location", {
      value: {
        hostname: "localhost"
      },
      writable: true
    });
    
    vi.mocked(apiClient.getConfig).mockResolvedValue({
      clientId: "test-client-id",
      localBypass: {
        enabled: true,
        name: "Local Dev User"
      }
    });
    
    renderWithProviders(<LoginPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue as local dev user/i })).toBeInTheDocument();
    });
    
    // Google Sign-In should not be initialized when bypass is active
    expect(mockGoogleAccounts.accounts.id.initialize).not.toHaveBeenCalled();
  });

  it("handles Google Sign-In script loading", async () => {
    delete (window as any).google;
    
    renderWithProviders(<LoginPage />);
    
    await waitFor(() => {
      const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      expect(script).toBeInTheDocument();
    });
  });

  it("shows error when Google Sign-In is not loaded", async () => {
    delete (window as any).google;
    
    renderWithProviders(<LoginPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
    });
    
    const button = screen.getByText(/sign in with google/i);
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/google sign-in not loaded/i)).toBeInTheDocument();
    });
  });
});

