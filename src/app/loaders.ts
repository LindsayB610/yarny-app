import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "react-router-dom";

import { apiClient, ApiError } from "../api/client";
import { createDriveClient } from "../api/driveClient";
import { fetchStories, STORIES_QUERY_KEY } from "../hooks/useStoriesQuery";

function ensureAuthenticated(): void {
  try {
    const token = window.localStorage.getItem("yarny_auth");
    if (!token) {
      throw redirect("/login");
    }
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    // If localStorage is unavailable (e.g. in private mode), fallback to login
    throw redirect("/login");
  }
}

function handleAuthError(error: unknown): never {
  if (error instanceof ApiError && error.data?.error === "Not authenticated") {
    throw redirect("/login");
  }
  throw error;
}

/**
 * Route loader for stories page - prefetches Yarny Stories folder and stories list
 */
export interface StoriesLoaderData {
  yarnyStoriesFolder: Awaited<
    ReturnType<typeof apiClient.getOrCreateYarnyStories>
  > | null;
  driveAuthorized: boolean;
}

function isDriveAuthorizationError(error: unknown): boolean {
  if (error instanceof ApiError) {
    const message = error.data?.error ?? error.message;
    if (!message) return false;
    const normalized = message.toLowerCase();
    return (
      normalized.includes("no drive tokens found") ||
      normalized.includes("authorize drive access") ||
      normalized.includes("no refresh token available")
    );
  }

  return false;
}

export async function storiesLoader(queryClient: QueryClient): Promise<StoriesLoaderData> {
  ensureAuthenticated();
  try {
    const yarnyStoriesFolder = await queryClient.ensureQueryData({
      queryKey: ["drive", "yarny-stories-folder"],
      queryFn: () => apiClient.getOrCreateYarnyStories()
    });

    await queryClient.ensureQueryData({
      queryKey: STORIES_QUERY_KEY,
      queryFn: () => fetchStories(queryClient)
    });

    return { yarnyStoriesFolder, driveAuthorized: true };
  } catch (error) {
    if (isDriveAuthorizationError(error)) {
      if (import.meta.env.DEV) {
        console.warn(
          "[Loader] Drive authorization error encountered. Allowing Stories page to render with Drive auth prompt.",
          error
        );
      }
      return {
        yarnyStoriesFolder: null,
        driveAuthorized: false
      };
    }

    return handleAuthError(error);
  }
}

/**
 * Route loader for editor page - prefetches Yarny Stories folder and project data
 */
export async function editorLoader(queryClient: QueryClient) {
  ensureAuthenticated();
  try {
    let yarnyStoriesFolder: Awaited<
      ReturnType<typeof apiClient.getOrCreateYarnyStories>
    > | null = null;

    try {
      yarnyStoriesFolder = await queryClient.fetchQuery({
        queryKey: ["drive", "yarny-stories-folder"],
        queryFn: () => apiClient.getOrCreateYarnyStories()
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(
          "[Loader] Yarny stories folder fetch failed in development; continuing with fallback data.",
          error
        );
      } else {
        throw error;
      }
    }

    // Prefetch projects list
    const driveClient = createDriveClient();
    const projects = await queryClient.fetchQuery({
      queryKey: ["drive", "projects"],
      queryFn: async () => {
        const normalized = await driveClient.listProjects();
        return normalized;
      }
    });

    return {
      yarnyStoriesFolder,
      projects
    };
  } catch (error) {
    return handleAuthError(error);
  }
}

