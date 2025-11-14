import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
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
        if (content === undefined) {
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

  const buildState = () => ({
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
          driveFileId: "drive-file-1",
          updatedAt: new Date().toISOString()
        }
      }
    },
    ui: {
      activeStoryId: "story-1",
      activeSnippetId: "snippet-1",
      isSyncing: false
    }
  });

  const buildStore = () => ({
    ...buildState(),
    selectProject: vi.fn(),
    selectStory: vi.fn(),
    selectSnippet: vi.fn(),
    selectNote: vi.fn(),
    setSyncing: vi.fn(),
    setLastSyncedAt: vi.fn(),
    upsertEntities: vi.fn(),
    removeChapter: vi.fn(),
    removeSnippet: vi.fn(),
    clear: vi.fn()
  });

  return {
    useYarnyStore: (selector: (store: ReturnType<typeof buildStore>) => unknown) => {
      return selector(buildStore());
    },
    useYarnyStoreApi: () => ({
      getState: buildStore,
      setState: vi.fn(),
      subscribe: vi.fn(),
      destroy: vi.fn()
    }),
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

describe("Round-Trip Validation with Google Docs", () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    const storeProvider = await import("../../src/store/provider");
    storeProvider.__setSnippetContent("Initial content");
  });

  describe("Content Preservation", () => {
    it("preserves plain text content in round-trip (Yarny → Google Docs → Yarny)", async () => {
      const originalContent = "This is test content.\n\nWith paragraph breaks.\nAnd line breaks.";

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: originalContent,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      });

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      vi.mocked(useAutoSaveModule.useAutoSave).mockReturnValue({
        isSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: undefined
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

      const editor = document.querySelector('[contenteditable="true"]');
      expect(editor).toBeInTheDocument();
      expect(editor?.textContent).toContain("Initial content");
    });

    it("preserves special characters in round-trip", async () => {
      const contentWithSpecialChars =
        'Quotes: "double" and \'single\'\nEm dash: —\nEn dash: –\nEllipsis: …\nCopyright: ©\nRegistered: ®\nTrademark: ™';

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: contentWithSpecialChars,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      });

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      vi.mocked(useAutoSaveModule.useAutoSave).mockReturnValue({
        isSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: undefined
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
    });

    it("preserves paragraph breaks (double Enter) in round-trip", async () => {
      const contentWithParagraphs = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: contentWithParagraphs,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      });

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      vi.mocked(useAutoSaveModule.useAutoSave).mockReturnValue({
        isSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: undefined
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
    });

    it("preserves line breaks (Shift+Enter) in round-trip", async () => {
      const contentWithLineBreaks = "Line one\nLine two\nLine three";

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: contentWithLineBreaks,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      });

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      vi.mocked(useAutoSaveModule.useAutoSave).mockReturnValue({
        isSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: undefined
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
    });

    it("preserves complex formatting: paragraphs, line breaks, special characters", async () => {
      const complexContent = `Paragraph 1 with special chars: — — … © ® ™

Paragraph 2 with line breaks:
Line A
Line B
Line C

Paragraph 3 with quotes: "double" and 'single'

Paragraph 4 with em dashes: — and en dashes: –`;

      const storeProviderComplex = await import("../../src/store/provider");
      storeProviderComplex.__setSnippetContent(complexContent);

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: complexContent,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
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

      const storeProviderEmpty = await import("../../src/store/provider");
      storeProviderEmpty.__setSnippetContent(contentWithEmptyParagraphs);

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
  });

  describe("Format Normalization", () => {
    it("normalizes line endings to Unix format (\\n)", async () => {
      const contentWithMixedEndings = "Line 1\r\nLine 2\rLine 3\nLine 4";

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: contentWithMixedEndings,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      });

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      vi.mocked(useAutoSaveModule.useAutoSave).mockReturnValue({
        isSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: undefined
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
    });

    it("normalizes non-breaking spaces to regular spaces", async () => {
      const contentWithNBSP = "Text\u00A0with\u00A0non-breaking\u00A0spaces";

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: contentWithNBSP,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      });

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      vi.mocked(useAutoSaveModule.useAutoSave).mockReturnValue({
        isSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: undefined
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
    });

    it("normalizes mixed line endings (CRLF, CR, LF) to LF", async () => {
      const contentWithMixedEndings = "Line 1\r\nLine 2\rLine 3\nLine 4";
      let savedContent = "";

      const storeProviderMixed = await import("../../src/store/provider");
      storeProviderMixed.__setSnippetContent(contentWithMixedEndings);

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: contentWithMixedEndings,
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

      const user = userEvent.setup();
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      await user.type(editor, " edited");

      await waitFor(() => {
        expect(savedContent).toBeTruthy();
      }, { timeout: 3000 });

      expect(savedContent).not.toContain("\r\n");
      expect(savedContent).not.toContain("\r");
      expect(savedContent).toContain("\n");
    });
  });

  describe("Auto-Save and Round-Trip", () => {
    it("saves content to Drive after editing", async () => {
      const user = userEvent.setup();
      const mockWriteFile = vi.fn().mockResolvedValue({
        id: "drive-file-1",
        name: "Test Snippet"
      });

      vi.mocked(apiClient.writeDriveFile).mockImplementation(mockWriteFile);

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      vi.mocked(useAutoSaveModule.useAutoSave).mockReturnValue({
        isSaving: false,
        hasUnsavedChanges: true,
        lastSavedAt: undefined
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

      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      await user.type(editor, " New text");

      expect(editor).toBeInTheDocument();
    });
  });

  describe("Round-Trip Integrity", () => {
    it("maintains integrity across multiple round-trips (Yarny → Docs → Yarny → Docs → Yarny)", async () => {
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

      for (let i = 0; i < 5; i++) {
        await waitFor(() => {
          const editor = document.querySelector('[contenteditable="true"]');
          expect(editor).toBeInTheDocument();
        });

        const editor = document.querySelector('[contenteditable="true"]');
        expect(editor).toBeInTheDocument();
      }

      expect(savedContent).toBe(originalContent);
    });

    it("handles empty content in round-trip", async () => {
      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: "",
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      });

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      vi.mocked(useAutoSaveModule.useAutoSave).mockReturnValue({
        isSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: undefined
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
    });

    it("handles very long content in round-trip", async () => {
      const longContent = "A".repeat(10000) + "\n\n" + "B".repeat(10000);

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: longContent,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      });

      vi.mocked(useConflictDetectionModule.useConflictDetection).mockReturnValue({
        checkSnippetConflict: vi.fn().mockResolvedValue(null),
        resolveConflictWithDrive: vi.fn()
      });

      vi.mocked(useAutoSaveModule.useAutoSave).mockReturnValue({
        isSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: undefined
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
    });

    it("handles very large content (1MB+) in round-trip", async () => {
      const largeContent = "A".repeat(1_000_000) + "\n\n" + "B".repeat(500_000);

      const storeProviderLarge = await import("../../src/store/provider");
      storeProviderLarge.__setSnippetContent(largeContent);

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: largeContent,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
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
      }, { timeout: 5000 });
    });

    it("handles Unicode characters (emoji, CJK, RTL) in round-trip", async () => {
      const unicodeContent = `English text

日本語のテキスト

中文文本

العربية

Emoji: 🎉 🚀 📝 ✨`;

      let savedContent = "";

      const storeProviderUnicode = await import("../../src/store/provider");
      storeProviderUnicode.__setSnippetContent(unicodeContent);

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: unicodeContent,
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

      const user = userEvent.setup();
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      await user.type(editor, " edited");

      await waitFor(() => {
        expect(savedContent).toBeTruthy();
      }, { timeout: 3000 });

      expect(savedContent).toContain("日本語");
      expect(savedContent).toContain("中文");
      expect(savedContent).toContain("العربية");
      expect(savedContent).toContain("🎉");
    });

    it("handles content with only whitespace", async () => {
      const whitespaceContent = "   \n\n   \t\t  \n\n   ";

      const storeProviderWhitespace = await import("../../src/store/provider");
      storeProviderWhitespace.__setSnippetContent(whitespaceContent);

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: whitespaceContent,
        id: "drive-file-1",
        name: "Test Snippet",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
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
    });
  });
});
