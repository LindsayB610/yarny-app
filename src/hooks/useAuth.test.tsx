import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAuth, useAuthConfig } from "./useAuth";
import { apiClient } from "../api/client";

// Mock the API client
vi.mock("../api/client", () => ({
  apiClient: {
    getConfig: vi.fn(),
    verifyGoogle: vi.fn(),
    logout: vi.fn()
  }
}));

describe("useAuth", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("useAuthConfig", () => {
    it("fetches auth config successfully", async () => {
      const mockConfig = {
        clientId: "test-client-id",
        localBypass: undefined
      };
      vi.mocked(apiClient.getConfig).mockResolvedValue(mockConfig);

      const { result } = renderHook(() => useAuthConfig(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockConfig);
    });

    it("uses fallback config in development when API fails", async () => {
      vi.mocked(apiClient.getConfig).mockRejectedValue(new Error("API Error"));
      const originalEnv = import.meta.env.DEV;
      (import.meta.env as any).DEV = true;

      const { result } = renderHook(() => useAuthConfig(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ clientId: "" });
      (import.meta.env as any).DEV = originalEnv;
    });
  });

  describe("useAuth", () => {
    it("returns unauthenticated state initially", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("loads user from localStorage on mount", () => {
      const mockUser = {
        email: "test@example.com",
        name: "Test User",
        token: "test-token"
      };
      localStorage.setItem("yarny_auth", mockUser.token);
      localStorage.setItem("yarny_user", JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it("handles invalid localStorage data gracefully", () => {
      localStorage.setItem("yarny_auth", "token");
      localStorage.setItem("yarny_user", "invalid-json");

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it("successfully logs in with Google token", async () => {
      const mockResponse = {
        verified: true,
        user: "test@example.com",
        name: "Test User",
        picture: "https://example.com/avatar.jpg",
        token: "session-token"
      };
      vi.mocked(apiClient.verifyGoogle).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await result.current.login("google-token");

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.user).toEqual({
        email: "test@example.com",
        name: "Test User",
        picture: "https://example.com/avatar.jpg",
        token: "session-token"
      });

      expect(localStorage.getItem("yarny_auth")).toBe("session-token");
      expect(localStorage.getItem("yarny_user")).toBeTruthy();
    });

    it("handles login failure", async () => {
      const error = new Error("Authentication failed");
      vi.mocked(apiClient.verifyGoogle).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(result.current.login("invalid-token")).rejects.toThrow("Authentication failed");

      expect(result.current.isAuthenticated).toBe(false);
    });

    it("successfully logs in with local bypass", async () => {
      const mockResponse = {
        verified: true,
        user: "local@example.com",
        name: "Local User",
        token: "bypass-token"
      };
      vi.mocked(apiClient.verifyGoogle).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await result.current.loginWithBypass("bypass-secret");

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(apiClient.verifyGoogle).toHaveBeenCalledWith({
        mode: "local-bypass",
        secret: "bypass-secret"
      });
    });

    it("successfully logs out", async () => {
      // Set up authenticated state
      const mockUser = {
        email: "test@example.com",
        token: "test-token"
      };
      localStorage.setItem("yarny_auth", mockUser.token);
      localStorage.setItem("yarny_user", JSON.stringify(mockUser));

      vi.mocked(apiClient.logout).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await result.current.logout();

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });

      expect(localStorage.getItem("yarny_auth")).toBeNull();
      expect(localStorage.getItem("yarny_user")).toBeNull();
    });

    it("shows loading state during login", async () => {
      vi.mocked(apiClient.verifyGoogle).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          verified: true,
          user: "test@example.com",
          token: "token"
        }), 100))
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      const loginPromise = result.current.login("token");

      // Wait for the mutation to start (isPending becomes true)
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await loginPromise;

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("syncs auth state on window focus", async () => {
      const mockUser1 = {
        email: "test1@example.com",
        token: "token1"
      };
      localStorage.setItem("yarny_auth", mockUser1.token);
      localStorage.setItem("yarny_user", JSON.stringify(mockUser1));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user?.email).toBe("test1@example.com");
      });

      // Change localStorage (simulating another tab)
      const mockUser2 = {
        email: "test2@example.com",
        token: "token2"
      };
      localStorage.setItem("yarny_auth", mockUser2.token);
      localStorage.setItem("yarny_user", JSON.stringify(mockUser2));

      // Simulate window focus
      window.dispatchEvent(new Event("focus"));

      await waitFor(() => {
        expect(result.current.user?.email).toBe("test2@example.com");
      });
    });
  });
});


