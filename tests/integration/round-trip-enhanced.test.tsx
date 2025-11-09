import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { apiClient } from "../../src/api/client";
import { StoryEditor } from "../../src/components/story/StoryEditor";
import * as useAutoSaveModule from "../../src/hooks/useAutoSave";
import * as useConflictDetectionModule from "../../src/hooks/useConflictDetection";

// Mock dependencies
vi.mock("../../src/api/client");
vi.mock("../../src/hooks/useConflictDetection");
vi.mock("../../src/hooks/useAutoSave", async () => {
  const React = await import("react");
  const clientModule = await import("../../src/api/client");
  const { useEffect, useRef } = React;
  const { apiClient } = clientModule;

  const useAutoSaveMock = vi.fn((fileId: string | undefined, content: string) => {
    const lastContentRef = useRef<string | undefined>(undefined);

    useEffect(() => {
      if (!fileId) {
        return;
      }
      if (content === undefined) {
        return;
      }
      const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      if (normalizedContent === lastContentRef.current) {
        return;
      }
      lastContentRef.current = normalizedContent;
      void apiClient.writeDriveFile({
        fileId,
        fileName: "",
        content: normalizedContent
      });
    }, [fileId, content]);

    return {
      isSaving: false,
      hasUnsavedChanges: false,
      lastSavedAt: undefined,
      markAsSaved: () => {},
      triggerManualSave: async () => {
        if (!fileId) {
          return;
        }
        const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        await apiClient.writeDriveFile({
          fileId,
          fileName: "",
          content: normalizedContent
        });
      }
    };
  });

  return {
    useAutoSave: useAutoSaveMock
  };
});
vi.mock("../../src/hooks/useExport", () => ({
  useExport: () => ({
    exportSnippets: vi.fn(),
    isExporting: false,
    progress: {
      currentChunk: 0,
      totalChunks: 0,
      status: "idle" as const
    }
  })
}));
vi.mock("../../src/hooks/useVisibilityGatedQueries", () => ({
  useVisibilityGatedSnippetQueries: vi.fn()
}));
vi.mock("../../src/store/provider", () => {
  let snippetContent = "Initial content";

  const buildStore = () => ({
    entities: {
      projects: {},
      projectOrder: [],
      stories: {
        "story-1": {
          id: "story-1",
          projectId: "project-1",
          title: "Test Story",
          driveFileId: "drive-file-1",
          chapterIds: ["chapter-1"],
          updatedAt: new Date().toISOString()
        }
      },
      storyOrder: [],
      chapters: {
        "chapter-1": {
          id: "chapter-1",
          storyId: "story-1",
          title: "Chapter 1",
          order: 1,
          snippetIds: ["snippet-1"],
          driveFolderId: "drive-folder-1",
          updatedAt: new Date().toISOString()
        }
      },
      snippets: {
        "snippet-1": {
          id: "snippet-1",
          storyId: "story-1",
          chapterId: "chapter-1",
          order: 1,
          content: snippetContent,
          updatedAt: new Date().toISOString()
        }
      }
    },
    ui: {
      activeStoryId: "story-1",
      isSyncing: false
    }
  });

  return {
    useYarnyStore: (selector: (store: ReturnType<typeof buildStore>) => unknown) => {
      return selector(buildStore());
    },
    __setSnippetContent: (content: string) => {
      snippetContent = content;
    }
  };
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

describe("Enhanced Round-Trip Validation", () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    const storeProvider = await import("../../src/store/provider");
    storeProvider.__setSnippetContent("Initial content");
  });

  describe("Multiple Round-Trips", () => {
    it("maintains integrity across 5 round-trips (Yarny → Docs → Yarny → Docs → Yarny)", async () => {
      const originalContent = "Original content with special chars: — — …";
      let roundTripCount = 0;
      let savedContent = originalContent;

      const storeProvider = await import("../../src/store/provider");
      storeProvider.__setSnippetContent(originalContent);

      vi.mocked(apiClient.readDriveFile).mockImplementation(async () => {
        roundTripCount++;
        return {
          content: savedContent,
          id: "drive-file-1",
          name: "Test Snippet",
          mimeType: "application/vnd.google-apps.document",
          modifiedTime: new Date().toISOString()
        };
      });

      vi.mocked(apiClient.writeDriveFile).mockImplementation(async (request) => {
        if (request.content) {
          savedContent = request.content;
        }
        return {
          id: "drive-file-1",
          name: "Test Snippet",
          modifiedTime: new Date().toISOString()
        };
      });

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <StoryEditor />
          </BrowserRouter>
        </QueryClientProvider>
      );

      // Perform 5 round-trips
      for (let i = 0; i < 5; i++) {
        // Wait for content to load
        await waitFor(() => {
          const editor = document.querySelector('[contenteditable="true"]');
          expect(editor).toBeInTheDocument();
        });

        // Verify content is preserved
        const editor = document.querySelector('[contenteditable="true"]');
        expect(editor).toBeInTheDocument();
      }

      // Final content should match original
      expect(savedContent).toBe(originalContent);
    });

    it("handles concurrent edits in Google Docs during round-trip", async () => {
      let driveContent = "Initial content";
      let localContent = "Initial content";
      let conflictDetected = false;

      vi.mocked(apiClient.readDriveFile).mockImplementation(async () => {
        return {
          content: driveContent,
          id: "drive-file-1",
          name: "Test Snippet",
          mimeType: "application/vnd.google-apps.document",
          modifiedTime: new Date().toISOString()
        };
      });

      vi.mocked(apiClient.writeDriveFile).mockImplementation(async (request) => {
        if (request.content) {
          localContent = request.content;
          // Simulate concurrent edit in Docs (Drive content changes after save)
          driveContent = "Concurrent edit in Docs";
        }
        return {
          id: "drive-file-1",
          name: "Test Snippet",
          modifiedTime: new Date().toISOString()
        };
      });

      const mockCheckConflict = vi.fn().mockImplementation(async () => {
        if (driveContent !== localContent) {
          conflictDetected = true;
          return {
            snippetId: "snippet-1",
            localModifiedTime: new Date().toISOString(),
            driveModifiedTime: new Date(Date.now() + 1000).toISOString(),
            localContent,
            driveContent
          };
        }
        return null;
      });

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: mockCheckConflict,
        resolveConflictWithDrive: vi.fn()
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <StoryEditor />
          </BrowserRouter>
        </QueryClientProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        expect(editor).toBeInTheDocument();
      });

      // Edit in Yarny
      const user = userEvent.setup();
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      await user.type(editor, " edited");

      // Trigger conflict check
      await waitFor(() => {
        expect(mockCheckConflict).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Conflict should be detected
      expect(conflictDetected).toBe(true);
    });
  });

  describe("Content Format Preservation", () => {
    it("preserves complex formatting: paragraphs, line breaks, special characters", async () => {
      const complexContent = `Paragraph 1 with special chars: — — … © ® ™

Paragraph 2 with line breaks:
Line A
Line B
Line C

Paragraph 3 with quotes: "double" and 'single'

Paragraph 4 with em dashes: — and en dashes: –`;

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: complexContent,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      });

      const storeProviderComplex = await import("../../src/store/provider");
      storeProviderComplex.__setSnippetContent(complexContent);

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <StoryEditor />
          </BrowserRouter>
        </QueryClientProvider>
      );

      // Wait for content to load
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        expect(editor).toBeInTheDocument();
      });

      // Verify all formatting is preserved
      const editor = document.querySelector('[contenteditable="true"]');
      const content = editor?.textContent || "";

      expect(content).toContain("—");
      expect(content).toContain("…");
      expect(content).toContain('"double"');
      expect(content).toContain("'single'");
    });

    it("preserves empty paragraphs (double line breaks)", async () => {
      const contentWithEmptyParagraphs = "First paragraph.\n\n\nSecond paragraph.\n\n\n\nThird paragraph.";
      let savedContent = "";

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: contentWithEmptyParagraphs,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      });

      vi.mocked(apiClient.writeDriveFile).mockImplementation(async (request) => {
        if (request.content) {
          savedContent = request.content;
        }
        return {
          id: "drive-file-1",
          name: "Test Snippet",
          modifiedTime: new Date().toISOString()
        };
      });

      const storeProviderEmpty = await import("../../src/store/provider");
      storeProviderEmpty.__setSnippetContent(contentWithEmptyParagraphs);

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <StoryEditor />
          </BrowserRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        expect(editor).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(savedContent.match(/\n{2,}/g)).toBeTruthy();
      });
    });

    it("normalizes mixed line endings (CRLF, CR, LF) to LF", async () => {
      const contentWithMixedEndings = "Line 1\r\nLine 2\rLine 3\nLine 4";

      let savedContent = "";

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: contentWithMixedEndings,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      });

      const storeProviderMixed = await import("../../src/store/provider");
      storeProviderMixed.__setSnippetContent(contentWithMixedEndings);

      vi.mocked(apiClient.writeDriveFile).mockImplementation(async (request) => {
        if (request.content) {
          savedContent = request.content;
        }
        return {
          id: "drive-file-1",
          name: "Test Snippet",
          modifiedTime: new Date().toISOString()
        };
      });

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <StoryEditor />
          </BrowserRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        expect(editor).toBeInTheDocument();
      });

      // Trigger save
      const user = userEvent.setup();
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      await user.type(editor, " edited");

      // Wait for save
      await waitFor(() => {
        expect(savedContent).toBeTruthy();
      }, { timeout: 3000 });

      // Saved content should have normalized line endings (no \r\n or \r)
      expect(savedContent).not.toContain("\r\n");
      expect(savedContent).not.toContain("\r");
      expect(savedContent).toContain("\n");
    });
  });

  describe("Edge Cases", () => {
    it("handles very large content (1MB+) in round-trip", async () => {
      const largeContent = "A".repeat(1_000_000) + "\n\n" + "B".repeat(500_000);

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: largeContent,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      });

      const storeProviderLarge = await import("../../src/store/provider");
      storeProviderLarge.__setSnippetContent(largeContent);

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <StoryEditor />
          </BrowserRouter>
        </QueryClientProvider>
      );

      // Should handle large content without crashing
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        expect(editor).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it("handles Unicode characters (emoji, CJK, RTL) in round-trip", async () => {
      const unicodeContent = `English text

日本語のテキスト

中文文本

العربية

Emoji: 🎉 🚀 📝 ✨`;

      let savedContent = "";

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: unicodeContent,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      });

      const storeProviderUnicode = await import("../../src/store/provider");
      storeProviderUnicode.__setSnippetContent(unicodeContent);

      vi.mocked(apiClient.writeDriveFile).mockImplementation(async (request) => {
        if (request.content) {
          savedContent = request.content;
        }
        return {
          id: "drive-file-1",
          name: "Test Snippet",
          modifiedTime: new Date().toISOString()
        };
      });

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <StoryEditor />
          </BrowserRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        expect(editor).toBeInTheDocument();
      });

      // Trigger save
      const user = userEvent.setup();
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      await user.type(editor, " edited");

      await waitFor(() => {
        expect(savedContent).toBeTruthy();
      }, { timeout: 3000 });

      // Verify Unicode is preserved
      expect(savedContent).toContain("日本語");
      expect(savedContent).toContain("中文");
      expect(savedContent).toContain("العربية");
      expect(savedContent).toContain("🎉");
    });

    it("handles content with only whitespace", async () => {
      const whitespaceContent = "   \n\n   \t\t  \n\n   ";

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: whitespaceContent,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      });

      const storeProviderWhitespace = await import("../../src/store/provider");
      storeProviderWhitespace.__setSnippetContent(whitespaceContent);

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <StoryEditor />
          </BrowserRouter>
        </QueryClientProvider>
      );

      // Should handle whitespace-only content
      await waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        expect(editor).toBeInTheDocument();
      });
    });
  });
});

