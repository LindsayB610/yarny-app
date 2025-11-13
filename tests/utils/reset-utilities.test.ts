import { QueryClient } from "@tanstack/react-query";
import { describe, it, expect, beforeEach } from "vitest";

import {
  resetStore,
  resetStoreToState,
  resetQueryClient,
  resetMSWHandlers,
  clearBrowserStorage,
  clearBrowserStorageKeys,
  resetAll,
  createTestCleanup,
  resetStoreEntities,
  resetStoreUI
} from "./reset-utilities";
import {
  createMockState,
  createMockStory,
  createMockSnippet,
  createMockProject
} from "./test-fixtures";
import { createYarnyStore } from "../../src/store/createStore";

describe("Reset Utilities", () => {
  describe("resetStore", () => {
    it("resets store to empty state", () => {
      const store = createYarnyStore(createMockState());
      expect(store.getState().entities.stories).not.toEqual({});

      resetStore(store);

      const state = store.getState();
      expect(Object.keys(state.entities.stories)).toHaveLength(0);
      expect(Object.keys(state.entities.projects)).toHaveLength(0);
      expect(state.ui.activeStoryId).toBeUndefined();
    });
  });

  describe("resetStoreToState", () => {
    it("resets store to specific initial state", () => {
      const store = createYarnyStore();
      const initialState = createMockState();

      resetStoreToState(store, initialState);

      const state = store.getState();
      expect(state.entities.stories["story-1"]).toBeDefined();
      expect(state.ui.activeStoryId).toBe("story-1");
    });

    it("preserves custom state when resetting", () => {
      const store = createYarnyStore();
      const customState = createMockState({
        ui: {
          selectedProjectId: "custom-project",
          activeStoryId: "custom-story",
          isSyncing: true,
          lastSyncedAt: "2025-01-02T00:00:00.000Z"
        }
      });

      resetStoreToState(store, customState);

      const state = store.getState();
      expect(state.ui.selectedProjectId).toBe("custom-project");
      expect(state.ui.activeStoryId).toBe("custom-story");
      expect(state.ui.isSyncing).toBe(true);
      expect(state.ui.lastSyncedAt).toBe("2025-01-02T00:00:00.000Z");
    });
  });

  describe("resetQueryClient", () => {
    it("clears all queries from query client", () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 }
        }
      });

      // Set some query data
      queryClient.setQueryData(["test"], { data: "test" });
      expect(queryClient.getQueryData(["test"])).toBeDefined();

      resetQueryClient(queryClient);

      expect(queryClient.getQueryData(["test"])).toBeUndefined();
    });
  });

  describe("resetMSWHandlers", () => {
    it("resets MSW handlers without throwing", () => {
      expect(() => resetMSWHandlers()).not.toThrow();
    });
  });

  describe("clearBrowserStorage", () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    it("clears all localStorage and sessionStorage", () => {
      localStorage.setItem("test-key", "test-value");
      sessionStorage.setItem("test-session", "test-session-value");

      expect(localStorage.getItem("test-key")).toBe("test-value");
      expect(sessionStorage.getItem("test-session")).toBe("test-session-value");

      clearBrowserStorage();

      expect(localStorage.getItem("test-key")).toBeNull();
      expect(sessionStorage.getItem("test-session")).toBeNull();
    });
  });

  describe("clearBrowserStorageKeys", () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    it("clears specific localStorage keys", () => {
      localStorage.setItem("key1", "value1");
      localStorage.setItem("key2", "value2");
      localStorage.setItem("key3", "value3");

      clearBrowserStorageKeys(["key1", "key2"]);

      expect(localStorage.getItem("key1")).toBeNull();
      expect(localStorage.getItem("key2")).toBeNull();
      expect(localStorage.getItem("key3")).toBe("value3");
    });

    it("clears specific sessionStorage keys", () => {
      sessionStorage.setItem("session1", "value1");
      sessionStorage.setItem("session2", "value2");

      clearBrowserStorageKeys(undefined, ["session1"]);

      expect(sessionStorage.getItem("session1")).toBeNull();
      expect(sessionStorage.getItem("session2")).toBe("value2");
    });
  });

  describe("resetAll", () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    it("resets all specified resources", () => {
      const store = createYarnyStore(createMockState());
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 }
        }
      });

      localStorage.setItem("test", "value");
      queryClient.setQueryData(["test"], { data: "test" });

      resetAll({
        store,
        queryClient,
        clearStorage: true
      });

      expect(Object.keys(store.getState().entities.stories)).toHaveLength(0);
      expect(queryClient.getQueryData(["test"])).toBeUndefined();
      expect(localStorage.getItem("test")).toBeNull();
    });

    it("can reset with custom initial state", () => {
      const store = createYarnyStore();
      const initialState = createMockState({
        ui: {
          selectedProjectId: "custom-project",
          activeStoryId: undefined,
          isSyncing: false,
          lastSyncedAt: undefined
        }
      });

      resetAll({
        store,
        initialState
      });

      expect(store.getState().ui.selectedProjectId).toBe("custom-project");
    });

    it("can reset only specific resources", () => {
      const store = createYarnyStore(createMockState());
      localStorage.setItem("keep-me", "value");
      localStorage.setItem("remove-me", "value");

      resetAll({
        store,
        resetMSW: false,
        clearStorage: true,
        storageKeys: {
          localStorage: ["remove-me"]
        }
      });

      expect(Object.keys(store.getState().entities.stories)).toHaveLength(0);
      expect(localStorage.getItem("keep-me")).toBe("value");
      expect(localStorage.getItem("remove-me")).toBeNull();
    });
  });

  describe("createTestCleanup", () => {
    it("returns a cleanup function that resets specified resources", () => {
      const store = createYarnyStore(createMockState());
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 }
        }
      });

      localStorage.setItem("test", "value");
      queryClient.setQueryData(["test"], { data: "test" });

      const cleanup = createTestCleanup({
        store,
        queryClient,
        clearStorage: true
      });

      cleanup();

      expect(Object.keys(store.getState().entities.stories)).toHaveLength(0);
      expect(queryClient.getQueryData(["test"])).toBeUndefined();
      expect(localStorage.getItem("test")).toBeNull();
    });
  });

  describe("resetStoreEntities", () => {
    it("resets entities but preserves UI state", () => {
      const store = createYarnyStore(createMockState());
      const originalUI = { ...store.getState().ui };

      // Add more entities
      const newStory = createMockStory({ id: "story-2" });
      store.getState().upsertEntities({ stories: [newStory] });

      expect(Object.keys(store.getState().entities.stories)).toHaveLength(2);

      resetStoreEntities(store);

      const state = store.getState();
      expect(Object.keys(state.entities.stories)).toHaveLength(0);
      expect(state.ui.selectedProjectId).toBe(originalUI.selectedProjectId);
      expect(state.ui.activeStoryId).toBe(originalUI.activeStoryId);
      expect(state.ui.isSyncing).toBe(originalUI.isSyncing);
      expect(state.ui.lastSyncedAt).toBe(originalUI.lastSyncedAt);
    });
  });

  describe("resetStoreUI", () => {
    it("resets UI state but preserves entities", () => {
      const store = createYarnyStore(createMockState());
      const originalEntities = { ...store.getState().entities };

      store.getState().selectStory("story-2");
      store.getState().setSyncing(true);

      resetStoreUI(store);

      const state = store.getState();
      expect(state.ui.selectedProjectId).toBeUndefined();
      expect(state.ui.activeStoryId).toBeUndefined();
      expect(state.ui.isSyncing).toBe(false);
      expect(state.ui.lastSyncedAt).toBeUndefined();
      expect(state.entities.stories).toEqual(originalEntities.stories);
      expect(state.entities.projects).toEqual(originalEntities.projects);
    });
  });
});





