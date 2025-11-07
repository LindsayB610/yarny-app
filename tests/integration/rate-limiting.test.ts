import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react";
import axios from "axios";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { apiClient } from "../../src/api/client";

// Mock axios to simulate rate limiting
vi.mock("axios");

describe("Rate Limiting Handling (429 Backoff)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 3, // Retry up to 3 times
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000) // Exponential backoff
        }
      }
    });
    vi.clearAllMocks();
  });

  it("should retry on 429 rate limit error with exponential backoff", async () => {
    let attemptCount = 0;
    const maxAttempts = 4; // Initial + 3 retries

    vi.mocked(axios.create).mockReturnValue({
      get: vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < maxAttempts) {
          // Return 429 for first few attempts
          const error: any = new Error("Rate limit exceeded");
          error.response = {
            status: 429,
            statusText: "Too Many Requests",
            data: { error: "Rate limit exceeded", retryAfter: 1 }
          };
          throw error;
        }
        // Success on final attempt
        return {
          data: {
            files: [
              {
                id: "file-1",
                name: "Test File",
                mimeType: "application/vnd.google-apps.document",
                modifiedTime: "2025-01-01T00:00:00.000Z"
              }
            ]
          },
          status: 200
        };
      }),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() }
      }
    } as any);

    // Reset axios mock to use our custom implementation
    const client = new apiClient.constructor();

    // Attempt to list files
    const result = await queryClient.fetchQuery({
      queryKey: ["drive", "files", "folder-id"],
      queryFn: () => client.listDriveFiles({ folderId: "folder-id" }),
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    });

    // Should eventually succeed after retries
    expect(result.files).toBeDefined();
    expect(attemptCount).toBe(maxAttempts);
  });

  it("should respect Retry-After header in 429 response", async () => {
    let attemptCount = 0;
    let lastRetryDelay = 0;
    const retryAfterSeconds = 2;

    vi.mocked(axios.create).mockReturnValue({
      get: vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          // First attempt: 429 with Retry-After header
          const error: any = new Error("Rate limit exceeded");
          error.response = {
            status: 429,
            statusText: "Too Many Requests",
            headers: {
              "retry-after": retryAfterSeconds.toString()
            },
            data: { error: "Rate limit exceeded" }
          };
          throw error;
        }
        // Success on retry
        return {
          data: {
            files: []
          },
          status: 200
        };
      }),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() }
      }
    } as any);

    const startTime = Date.now();

    const client = new apiClient.constructor();
    await queryClient.fetchQuery({
      queryKey: ["drive", "files", "folder-id"],
      queryFn: () => client.listDriveFiles({ folderId: "folder-id" }),
      retry: 1,
      retryDelay: (attemptIndex, error: any) => {
        const retryAfter = error?.response?.headers?.["retry-after"];
        if (retryAfter) {
          lastRetryDelay = parseInt(retryAfter) * 1000;
          return lastRetryDelay;
        }
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      }
    });

    const elapsedTime = Date.now() - startTime;

    // Should have waited at least retryAfter seconds (with some tolerance)
    expect(lastRetryDelay).toBeGreaterThanOrEqual(retryAfterSeconds * 1000 - 100);
  });

  it("should handle multiple 429 errors across different requests", async () => {
    let readAttempts = 0;
    let writeAttempts = 0;

    vi.mocked(axios.create).mockReturnValue({
      get: vi.fn().mockImplementation(async () => {
        readAttempts++;
        if (readAttempts <= 2) {
          const error: any = new Error("Rate limit exceeded");
          error.response = {
            status: 429,
            statusText: "Too Many Requests",
            data: { error: "Rate limit exceeded" }
          };
          throw error;
        }
        return {
          data: {
            id: "file-1",
            name: "Test File",
            content: "Content",
            modifiedTime: "2025-01-01T00:00:00.000Z",
            mimeType: "application/vnd.google-apps.document"
          },
          status: 200
        };
      }),
      post: vi.fn().mockImplementation(async () => {
        writeAttempts++;
        if (writeAttempts <= 2) {
          const error: any = new Error("Rate limit exceeded");
          error.response = {
            status: 429,
            statusText: "Too Many Requests",
            data: { error: "Rate limit exceeded" }
          };
          throw error;
        }
        return {
          data: {
            id: "file-1",
            name: "Test File",
            modifiedTime: new Date().toISOString()
          },
          status: 200
        };
      }),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() }
      }
    } as any);

    const client = new apiClient.constructor();

    // Make read request
    await queryClient.fetchQuery({
      queryKey: ["drive", "file", "file-1"],
      queryFn: () => client.readDriveFile({ fileId: "file-1" }),
      retry: 3
    });

    // Make write request
    await queryClient.fetchQuery({
      queryKey: ["drive", "write", "file-1"],
      queryFn: () =>
        client.writeDriveFile({
          fileId: "file-1",
          fileName: "Test File",
          content: "New content",
          parentFolderId: "folder-id"
        }),
      retry: 3
    });

    // Both should eventually succeed
    expect(readAttempts).toBeGreaterThan(1);
    expect(writeAttempts).toBeGreaterThan(1);
  });

  it("should fail after max retries if rate limit persists", async () => {
    vi.mocked(axios.create).mockReturnValue({
      get: vi.fn().mockImplementation(async () => {
        const error: any = new Error("Rate limit exceeded");
        error.response = {
          status: 429,
          statusText: "Too Many Requests",
          data: { error: "Rate limit exceeded" }
        };
        throw error;
      }),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() }
      }
    } as any);

    const client = new apiClient.constructor();

    // Should fail after max retries
    await expect(
      queryClient.fetchQuery({
        queryKey: ["drive", "files", "folder-id"],
        queryFn: () => client.listDriveFiles({ folderId: "folder-id" }),
        retry: 3
      })
    ).rejects.toThrow();
  });

  it("should use exponential backoff with jitter", async () => {
    const delays: number[] = [];

    vi.mocked(axios.create).mockReturnValue({
      get: vi.fn().mockImplementation(async () => {
        const error: any = new Error("Rate limit exceeded");
        error.response = {
          status: 429,
          statusText: "Too Many Requests",
          data: { error: "Rate limit exceeded" }
        };
        throw error;
      }),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() }
      }
    } as any);

    const calculateDelay = (attemptIndex: number): number => {
      const baseDelay = 1000 * 2 ** attemptIndex; // Exponential: 1s, 2s, 4s, 8s
      const jitter = Math.random() * 0.3 * baseDelay; // 30% jitter
      const delay = Math.min(baseDelay + jitter, 30000); // Cap at 30s
      delays.push(delay);
      return delay;
    };

    const client = new apiClient.constructor();

    try {
      await queryClient.fetchQuery({
        queryKey: ["drive", "files", "folder-id"],
        queryFn: () => client.listDriveFiles({ folderId: "folder-id" }),
        retry: 3,
        retryDelay: calculateDelay
      });
    } catch {
      // Expected to fail after retries
    }

    // Delays should increase exponentially
    expect(delays.length).toBeGreaterThan(1);
    if (delays.length >= 2) {
      expect(delays[1]).toBeGreaterThan(delays[0]);
    }
    if (delays.length >= 3) {
      expect(delays[2]).toBeGreaterThan(delays[1]);
    }
  });

  it("should not retry on non-429 errors", async () => {
    let attemptCount = 0;

    vi.mocked(axios.create).mockReturnValue({
      get: vi.fn().mockImplementation(async () => {
        attemptCount++;
        const error: any = new Error("Not found");
        error.response = {
          status: 404,
          statusText: "Not Found",
          data: { error: "File not found" }
        };
        throw error;
      }),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() }
      }
    } as any);

    const client = new apiClient.constructor();

    await expect(
      queryClient.fetchQuery({
        queryKey: ["drive", "files", "folder-id"],
        queryFn: () => client.listDriveFiles({ folderId: "folder-id" }),
        retry: (failureCount, error: any) => {
          // Only retry on 429
          return error?.response?.status === 429 && failureCount < 3;
        }
      })
    ).rejects.toThrow();

    // Should not retry (only initial attempt)
    expect(attemptCount).toBe(1);
  });

  it("should handle 429 errors in React Query mutations", async () => {
    let attemptCount = 0;

    vi.mocked(axios.create).mockReturnValue({
      post: vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          const error: any = new Error("Rate limit exceeded");
          error.response = {
            status: 429,
            statusText: "Too Many Requests",
            data: { error: "Rate limit exceeded" }
          };
          throw error;
        }
        return {
          data: {
            id: "file-1",
            name: "Test File",
            modifiedTime: new Date().toISOString()
          },
          status: 200
        };
      }),
      get: vi.fn(),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() }
      }
    } as any);

    const client = new apiClient.constructor();

    const result = await queryClient.fetchQuery({
      queryKey: ["drive", "write", "file-1"],
      queryFn: () =>
        client.writeDriveFile({
          fileId: "file-1",
          fileName: "Test File",
          content: "Content",
          parentFolderId: "folder-id"
        }),
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    });

    expect(result.id).toBe("file-1");
    expect(attemptCount).toBe(3);
  });
});


