import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, renderWithProviders, userEvent } from "../utils/test-utils";
import { StorySidebarContent } from "../../src/components/story/StorySidebarContent";
import { useYarnyStoreApi } from "../../src/store/provider";
import { type Chapter, type Project, type Story } from "../../src/store/types";
import { useEffect, type ReactNode } from "react";

vi.mock("../../src/api/client", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../src/api/client")>();

  let nextFolderId = 2;

  const storyFolderId = "drive-file-1";
  const chaptersFolderId = "chapters-folder-1";
  const dataFileId = "data-file-1";
  const projectFileId = "project-file-1";

  let projectJson: Record<string, unknown> = {
    groupIds: ["chapter-1"],
    updatedAt: "2025-11-08T00:00:00.000Z"
  };

  let dataJson: Record<string, unknown> = {
    groups: {
      "chapter-1": {
        id: "chapter-1",
        title: "Chapter 1",
        color: "#3B82F6",
        snippetIds: [],
        position: 0,
        driveFolderId: "chapter-folder-1",
        updatedAt: "2025-11-08T00:00:00.000Z"
      }
    },
    snippets: {}
  };

  return {
    ...mod,
    apiClient: {
      ...mod.apiClient,
      listDriveFiles: vi.fn(async ({ folderId }: { folderId: string }) => {
        if (folderId === storyFolderId) {
          return {
            files: [
              {
                id: dataFileId,
                name: "data.json",
                mimeType: "application/json"
              },
              {
                id: projectFileId,
                name: "project.json",
                mimeType: "application/json"
              },
              {
                id: chaptersFolderId,
                name: "Chapters",
                mimeType: "application/vnd.google-apps.folder"
              }
            ]
          };
        }

        return { files: [] };
      }),
      readDriveFile: vi.fn(async ({ fileId }: { fileId: string }) => {
        if (fileId === dataFileId) {
          return {
            content: JSON.stringify(dataJson)
          };
        }

        if (fileId === projectFileId) {
          return {
            content: JSON.stringify(projectJson)
          };
        }

        return { content: "" };
      }),
      writeDriveFile: vi.fn(async ({ fileId, fileName, content }: { fileId?: string; fileName: string; content: string }) => {
        if (fileName === "data.json") {
          dataJson = JSON.parse(content) as typeof dataJson;
          return { id: fileId ?? dataFileId };
        }

        if (fileName === "project.json") {
          projectJson = JSON.parse(content) as typeof projectJson;
          return { id: fileId ?? projectFileId };
        }

        return { id: fileId ?? "file-" + Math.random().toString(36).slice(2) };
      }),
      createDriveFolder: vi.fn(async ({ name }: { name: string }) => ({
        id: `chapter-folder-${nextFolderId++}`,
        name
      }))
    }
  };
});

function StoreInitializer({ children }: { children: ReactNode }) {
  const store = useYarnyStoreApi();

  useEffect(() => {
    const now = "2025-11-08T00:00:00.000Z";
    const project: Project = {
      id: "project-1",
      name: "Project 1",
      driveFolderId: "drive-folder-1",
      storyIds: ["story-1"],
      updatedAt: now
    };

    const chapters: Record<string, Chapter> = {
      "chapter-1": {
        id: "chapter-1",
        storyId: "story-1",
        title: "Chapter 1",
        color: "#3B82F6",
        order: 0,
        snippetIds: [],
        driveFolderId: "chapter-folder-1",
        updatedAt: now
      }
    };

    const story: Story = {
      id: "story-1",
      projectId: project.id,
      title: "Story One",
      driveFileId: "drive-file-1",
      chapterIds: Object.keys(chapters),
      updatedAt: now
    };

    const storeState = store.getState();
    storeState.clear();
    storeState.upsertEntities({
      projects: [project],
      stories: [story],
      chapters: Object.values(chapters)
    });
    storeState.selectProject(project.id);
    storeState.selectStory(story.id);
  }, [store]);

  return <>{children}</>;
}

describe("StorySidebarContent - New Chapter", () => {
  it("shows newly created chapters even when a search filter is active", async () => {
    renderWithProviders(
      <StoreInitializer>
        <StorySidebarContent searchTerm="foo" />
      </StoreInitializer>
    );

    const createButton = await screen.findByRole("button", { name: /new chapter/i });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Chapter 2")).toBeInTheDocument();
    });
  });
});

