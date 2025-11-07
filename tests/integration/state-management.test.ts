import { describe, expect, it } from "vitest";
import { createYarnyStore } from "../../src/store/createStore";
import { createMockState, createMockStory, createMockSnippet } from "../utils/test-fixtures";
import type { YarnyState } from "../../src/store/types";

describe("State Management", () => {
  describe("Store CRUD Operations", () => {
    it("creates store with initial state", () => {
      const initialState = createMockState();
      const store = createYarnyStore(initialState);

      expect(store.getState().entities.stories).toBeDefined();
      expect(store.getState().ui.activeStoryId).toBe("story-1");
    });

    it("upserts entities correctly", () => {
      const store = createYarnyStore(createMockState());

      const newStory = createMockStory({
        id: "story-2",
        title: "New Story"
      });

      store.getState().upsertEntities({
        stories: [newStory]
      });

      const state = store.getState();
      expect(state.entities.stories["story-2"]).toBeDefined();
      expect(state.entities.stories["story-2"].title).toBe("New Story");
    });

    it("updates existing entities", () => {
      const store = createYarnyStore(createMockState());

      const updatedStory = createMockStory({
        id: "story-1",
        title: "Updated Story"
      });

      store.getState().upsertEntities({
        stories: [updatedStory]
      });

      const state = store.getState();
      expect(state.entities.stories["story-1"].title).toBe("Updated Story");
    });

    it("selects project", () => {
      const store = createYarnyStore(createMockState());

      store.getState().selectProject("project-2");

      expect(store.getState().ui.selectedProjectId).toBe("project-2");
    });

    it("selects story", () => {
      const store = createYarnyStore(createMockState());

      store.getState().selectStory("story-2");

      expect(store.getState().ui.activeStoryId).toBe("story-2");
    });

    it("clears all state", () => {
      const store = createYarnyStore(createMockState());

      store.getState().clear();

      const state = store.getState();
      expect(Object.keys(state.entities.stories)).toHaveLength(0);
      expect(state.ui.activeStoryId).toBeUndefined();
    });

    it("sets syncing state", () => {
      const store = createYarnyStore(createMockState());

      store.getState().setSyncing(true);
      expect(store.getState().ui.isSyncing).toBe(true);

      store.getState().setSyncing(false);
      expect(store.getState().ui.isSyncing).toBe(false);
    });

    it("sets last synced timestamp", () => {
      const store = createYarnyStore(createMockState());
      const timestamp = "2025-01-02T00:00:00.000Z";

      store.getState().setLastSyncedAt(timestamp);

      expect(store.getState().ui.lastSyncedAt).toBe(timestamp);
    });
  });

  describe("Normalized State Structure", () => {
    it("maintains normalized entities by id", () => {
      const store = createYarnyStore(createMockState());

      const snippet1 = createMockSnippet({ id: "snippet-1", order: 1 });
      const snippet2 = createMockSnippet({ id: "snippet-2", order: 2 });

      store.getState().upsertEntities({
        snippets: [snippet1, snippet2]
      });

      const state = store.getState();
      expect(state.entities.snippets["snippet-1"]).toBeDefined();
      expect(state.entities.snippets["snippet-2"]).toBeDefined();
      expect(Object.keys(state.entities.snippets)).toHaveLength(2);
    });

    it("maintains order arrays", () => {
      const store = createYarnyStore(createMockState());

      const story1 = createMockStory({ id: "story-1" });
      const story2 = createMockStory({ id: "story-2" });

      store.getState().upsertEntities({
        stories: [story1, story2]
      });

      const state = store.getState();
      expect(state.entities.storyOrder).toContain("story-1");
      expect(state.entities.storyOrder).toContain("story-2");
    });
  });
});

