import type { QueryClient } from "@tanstack/react-query";

import { createMockState } from "./test-fixtures";
import type { YarnyStoreApi } from "../../src/store/types";
import { handlers } from "../setup/msw-handlers";
import { server } from "../setup/msw-server";

/**
 * Reset utilities for test data management.
 * 
 * These utilities help ensure test isolation by resetting:
 * - Zustand store state
 * - React Query cache
 * - MSW request handlers
 * - Browser storage (localStorage, sessionStorage)
 * - Mock data state
 */

/**
 * Resets the Zustand store to its default state.
 * @param store - The Zustand store instance to reset
 */
export function resetStore(store: YarnyStoreApi): void {
  store.getState().clear();
}

/**
 * Resets the Zustand store to a specific initial state.
 * @param store - The Zustand store instance to reset
 * @param initialState - Optional initial state to reset to (defaults to empty mock state)
 */
export function resetStoreToState(
  store: YarnyStoreApi,
  initialState = createMockState()
): void {
  store.getState().clear();
  store.getState().upsertEntities({
    projects: initialState.entities.projects
      ? Object.values(initialState.entities.projects)
      : [],
    stories: initialState.entities.stories
      ? Object.values(initialState.entities.stories)
      : [],
    chapters: initialState.entities.chapters
      ? Object.values(initialState.entities.chapters)
      : [],
    snippets: initialState.entities.snippets
      ? Object.values(initialState.entities.snippets)
      : []
  });
  if (initialState.ui.selectedProjectId) {
    store.getState().selectProject(initialState.ui.selectedProjectId);
  }
  if (initialState.ui.activeStoryId) {
    store.getState().selectStory(initialState.ui.activeStoryId);
  }
  if (initialState.ui.lastSyncedAt) {
    store.getState().setLastSyncedAt(initialState.ui.lastSyncedAt);
  }
  store.getState().setSyncing(initialState.ui.isSyncing);
}

/**
 * Resets the React Query cache.
 * @param queryClient - The QueryClient instance to reset
 */
export function resetQueryClient(queryClient: QueryClient): void {
  queryClient.clear();
}

/**
 * Resets MSW request handlers to their default state.
 * This is useful when tests modify handlers and need to restore defaults.
 */
export function resetMSWHandlers(): void {
  server.resetHandlers(...handlers);
}

/**
 * Clears all browser storage (localStorage and sessionStorage).
 * Useful for tests that rely on storage state.
 */
export function clearBrowserStorage(): void {
  localStorage.clear();
  sessionStorage.clear();
}

/**
 * Clears specific keys from browser storage.
 * @param localStorageKeys - Keys to remove from localStorage
 * @param sessionStorageKeys - Keys to remove from sessionStorage
 */
export function clearBrowserStorageKeys(
  localStorageKeys?: string[],
  sessionStorageKeys?: string[]
): void {
  if (localStorageKeys) {
    localStorageKeys.forEach((key) => localStorage.removeItem(key));
  }
  if (sessionStorageKeys) {
    sessionStorageKeys.forEach((key) => sessionStorage.removeItem(key));
  }
}

/**
 * Resets all test data to a clean state.
 * This is a convenience function that resets everything at once.
 * 
 * @param options - Configuration options for what to reset
 */
export interface ResetAllOptions {
  store?: YarnyStoreApi;
  queryClient?: QueryClient;
  resetMSW?: boolean;
  clearStorage?: boolean;
  storageKeys?: {
    localStorage?: string[];
    sessionStorage?: string[];
  };
  initialState?: ReturnType<typeof createMockState>;
}

export function resetAll(options: ResetAllOptions = {}): void {
  const {
    store,
    queryClient,
    resetMSW = true,
    clearStorage = false,
    storageKeys,
    initialState
  } = options;

  // Reset MSW handlers
  if (resetMSW) {
    resetMSWHandlers();
  }

  // Reset store
  if (store) {
    if (initialState) {
      resetStoreToState(store, initialState);
    } else {
      resetStore(store);
    }
  }

  // Reset query client
  if (queryClient) {
    resetQueryClient(queryClient);
  }

  // Clear browser storage
  if (clearStorage) {
    if (storageKeys) {
      clearBrowserStorageKeys(
        storageKeys.localStorage,
        storageKeys.sessionStorage
      );
    } else {
      clearBrowserStorage();
    }
  }
}

/**
 * Creates a test cleanup function that resets all specified resources.
 * Useful for afterEach hooks in tests.
 * 
 * @param options - Configuration options for what to reset
 * @returns A cleanup function that can be called in afterEach
 */
export function createTestCleanup(
  options: ResetAllOptions = {}
): () => void {
  return () => {
    resetAll(options);
  };
}

/**
 * Resets only the entities in the store, preserving UI state.
 * Useful when you want to reset data but keep UI selections.
 * 
 * @param store - The Zustand store instance
 */
export function resetStoreEntities(store: YarnyStoreApi): void {
  const currentState = store.getState();
  store.getState().clear();
  // Restore UI state
  if (currentState.ui.selectedProjectId) {
    store.getState().selectProject(currentState.ui.selectedProjectId);
  }
  if (currentState.ui.activeStoryId) {
    store.getState().selectStory(currentState.ui.activeStoryId);
  }
  if (currentState.ui.lastSyncedAt) {
    store.getState().setLastSyncedAt(currentState.ui.lastSyncedAt);
  }
  store.getState().setSyncing(currentState.ui.isSyncing);
}

/**
 * Resets only the UI state in the store, preserving entities.
 * Useful when you want to reset selections but keep data.
 * 
 * @param store - The Zustand store instance
 */
export function resetStoreUI(store: YarnyStoreApi): void {
  store.getState().selectProject(undefined);
  store.getState().selectStory(undefined);
  store.getState().setSyncing(false);
  store.getState().setLastSyncedAt(undefined);
}

