import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "react-router-dom";

import { apiClient, ApiError } from "../api/client";
import { createDriveClient } from "../api/driveClient";
import { fetchStories, STORIES_QUERY_KEY } from "../hooks/useStoriesQuery";
import { loadAllLocalProjects } from "../services/localFileStorage/loadLocalProject";
import { loadLocalProjectFromHandle } from "../services/localFileStorage/loadLocalProject";
import { getPersistedDirectoryHandle } from "../services/localFs/LocalFsCapability";

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
  yarnyStoriesFolder: Awaited<ReturnType<typeof apiClient.getOrCreateYarnyStories>> | null;
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
      normalized.includes("no refresh token available") ||
      normalized.includes("refresh token expired") ||
      normalized.includes("refresh token revoked")
    );
  }

  return false;
}

export async function storiesLoader(queryClient: QueryClient): Promise<StoriesLoaderData> {
  ensureAuthenticated();
  
  // Load local projects first (they don't require Drive auth)
  try {
    const localProjects = await loadAllLocalProjects();
    if (localProjects.projects.length > 0) {
      // Store local projects in query cache so they're available to components
      queryClient.setQueryData(["local", "projects"], localProjects);
    }
  } catch (error) {
    console.warn("[Loader] Failed to load local projects:", error);
    // Continue - local projects are optional
  }
  
  try {
    const yarnyStoriesFolder = await queryClient.ensureQueryData({
      queryKey: ["drive", "yarny-stories-folder"],
      queryFn: () => apiClient.getOrCreateYarnyStories(),
    });

    await queryClient.ensureQueryData({
      queryKey: STORIES_QUERY_KEY,
      queryFn: () => fetchStories(queryClient),
    });

    return { yarnyStoriesFolder, driveAuthorized: true };
  } catch (error) {
    if (isDriveAuthorizationError(error)) {
      if (import.meta.env.DEV) {
        console.warn(
          "[Loader] Drive authorization error encountered. Allowing Stories page to render with Drive auth prompt.",
          error,
        );
      }
      return {
        yarnyStoriesFolder: null,
        driveAuthorized: false,
      };
    }

    return handleAuthError(error);
  }
}

/**
 * Route loader for editor page - prefetches Yarny Stories folder and project data
 * Validates story and content (snippet or note) exist in route params
 */
export async function editorLoader(
  queryClient: QueryClient,
  params: { storyId?: string; snippetId?: string; noteId?: string; noteType?: string },
) {
  ensureAuthenticated();

  const { storyId, snippetId, noteId, noteType } = params;

  if (!storyId) {
    throw redirect("/stories");
  }

  try {
    let yarnyStoriesFolder: Awaited<ReturnType<typeof apiClient.getOrCreateYarnyStories>> | null =
      null;

    try {
      yarnyStoriesFolder = await queryClient.fetchQuery({
        queryKey: ["drive", "yarny-stories-folder"],
        queryFn: () => apiClient.getOrCreateYarnyStories(),
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(
          "[Loader] Yarny stories folder fetch failed in development; continuing with fallback data.",
          error,
        );
      } else {
        throw error;
      }
    }

    // Check if this is a local project (starts with "local-story")
    const isLocalProject = storyId.startsWith("local-story");
    
    let projects;
    let storyData;

    if (isLocalProject) {
      // For local projects, load from the persisted directory handle
      const rootHandle = await getPersistedDirectoryHandle();
      if (!rootHandle) {
        // No persisted handle - redirect to stories
        throw redirect("/stories");
      }

      // Load the actual story data from files
      const localData = await loadLocalProjectFromHandle(rootHandle);
      if (!localData?.stories.some((s) => s.id === storyId)) {
        // Story not found in local project - redirect
        throw redirect("/stories");
      }

      // Note: We don't upsert here because loaders run outside React
      // The component (AppLayout) will handle upserting via useDriveStoryQuery
      // Use the loaded data for validation
      projects = {
        projects: localData.projects || [],
        stories: localData.stories || [],
        chapters: localData.chapters || [],
        snippets: localData.snippets || []
      };
      
      const story = localData.stories.find((s) => s.id === storyId);
      storyData = {
        stories: story ? [story] : [],
        chapters: localData.chapters || [],
        snippets: localData.snippets || [],
        notes: []
      };
    } else {
      // For Drive projects, use existing flow
      const driveClient = createDriveClient();
      projects = await queryClient.fetchQuery({
        queryKey: ["drive", "projects"],
        queryFn: async () => {
          const normalized = await driveClient.listProjects();
          return normalized;
        },
      });

      // Validate story exists
      const storyExists = projects.stories?.some((s) => s.id === storyId);
      if (!storyExists) {
        throw redirect("/stories");
      }

      // Prefetch story data to validate content
      storyData = await queryClient.fetchQuery({
        queryKey: ["drive", "story", storyId],
        queryFn: () => driveClient.getStory(storyId),
      });
    }

    if (noteId && noteType) {
      // Validate note exists in story
        const noteKindMap: Record<string, "character" | "worldbuilding"> = {
          characters: "character",
          worldbuilding: "worldbuilding",
        };
        const kind = noteKindMap[noteType] ?? "character";
      const noteExists = storyData.notes?.some((n) => n.id === noteId && n.kind === kind);
      if (!noteExists) {
        // Redirect to first note of that type if note doesn't exist
        const firstNote = storyData.notes?.find((n) => n.kind === kind);
        if (firstNote) {
            const noteTypeMap: Record<string, string> = {
              character: "characters",
              worldbuilding: "worldbuilding",
            };
            const routeNoteType = noteTypeMap[kind] ?? "characters";
          throw redirect(`/stories/${storyId}/${routeNoteType}/${firstNote.id}`);
        } else {
          // No notes of this type, redirect to first snippet
          const firstSnippet = storyData.snippets?.[0];
          if (firstSnippet) {
            throw redirect(`/stories/${storyId}/snippets/${firstSnippet.id}`);
          } else {
            throw redirect("/stories");
          }
        }
      }
    } else if (snippetId) {
      // Validate snippet exists in story
      const snippetExists = storyData.snippets?.some((s) => s.id === snippetId);
      if (!snippetExists) {
        // Redirect to first snippet if snippet doesn't exist
        const firstSnippet = storyData.snippets?.[0];
        if (firstSnippet) {
          throw redirect(`/stories/${storyId}/snippets/${firstSnippet.id}`);
        } else {
          throw redirect("/stories");
        }
      }
    } else {
      // No contentId provided, redirect to first snippet
      const firstSnippet = storyData.snippets?.[0];
      if (firstSnippet) {
        throw redirect(`/stories/${storyId}/snippets/${firstSnippet.id}`);
      } else {
        // Story has no snippets, redirect to stories page
        throw redirect("/stories");
      }
    }

    return {
      yarnyStoriesFolder,
      projects,
      // For local projects, include the loaded data so components can access it
      localData: isLocalProject ? storyData : undefined
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    return handleAuthError(error);
  }
}
