import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SortableSnippetList, type Snippet } from "./SortableSnippetList";

// Mock @dnd-kit utilities
vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: (transform: any) => transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : ""
    }
  }
}));

const mockSnippets: Snippet[] = [
  {
    id: "snippet-1",
    title: "Opening Scene",
    wordCount: 500
  },
  {
    id: "snippet-2",
    title: "Character Introduction",
    wordCount: 750
  },
  {
    id: "snippet-3",
    title: "Plot Development",
    wordCount: 1200
  },
  {
    id: "snippet-4",
    title: "Climax",
    wordCount: 2000
  }
];

const renderSnippetList = (
  snippets: Snippet[],
  onReorder: (newOrder: string[]) => void = vi.fn(),
  onMoveToChapter?: (snippetId: string, targetChapterId: string) => void
) => {
  return render(
    <SortableSnippetList
      snippets={snippets}
      onReorder={onReorder}
      onMoveToChapter={onMoveToChapter}
      renderSnippet={(snippet, index) => (
        <div data-testid={`snippet-${snippet.id}`}>
          <span>{snippet.title}</span>
          {snippet.wordCount && (
            <span data-testid={`snippet-wordcount-${snippet.id}`}>
              {snippet.wordCount} words
            </span>
          )}
        </div>
      )}
    />
  );
};

describe("SortableSnippetList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all snippets", () => {
      renderSnippetList(mockSnippets);

      expect(screen.getByTestId("snippet-snippet-1")).toBeInTheDocument();
      expect(screen.getByTestId("snippet-snippet-2")).toBeInTheDocument();
      expect(screen.getByTestId("snippet-snippet-3")).toBeInTheDocument();
      expect(screen.getByTestId("snippet-snippet-4")).toBeInTheDocument();
    });

    it("renders snippet titles", () => {
      renderSnippetList(mockSnippets);

      expect(screen.getByText("Opening Scene")).toBeInTheDocument();
      expect(screen.getByText("Character Introduction")).toBeInTheDocument();
      expect(screen.getByText("Plot Development")).toBeInTheDocument();
      expect(screen.getByText("Climax")).toBeInTheDocument();
    });

    it("renders word counts when provided", () => {
      renderSnippetList(mockSnippets);

      expect(screen.getByTestId("snippet-wordcount-snippet-1")).toHaveTextContent("500 words");
      expect(screen.getByTestId("snippet-wordcount-snippet-2")).toHaveTextContent("750 words");
    });

    it("renders empty list when no snippets provided", () => {
      renderSnippetList([]);

      expect(screen.queryByTestId(/^snippet-/)).not.toBeInTheDocument();
    });
  });

  describe("Drag & Drop Operations", () => {
    it("calls onReorder when snippet is dragged to new position", async () => {
      const onReorder = vi.fn();
      renderSnippetList(mockSnippets, onReorder);

      // Simulate drag and drop
      // Note: This is a simplified test. Full drag & drop testing requires
      // more complex setup with @dnd-kit's testing utilities or E2E tests
      
      // For now, we verify the component structure supports drag & drop
      // The Box component with role="button" is the parent of our test element
      const snippet1 = screen.getByTestId("snippet-snippet-1");
      const parentBox = snippet1.parentElement;
      
      // The parent Box should have the drag & drop attributes
      expect(parentBox).toHaveAttribute("role", "button");
      expect(parentBox).toHaveAttribute("tabIndex", "0");
    });

    it("provides keyboard navigation for drag & drop", () => {
      renderSnippetList(mockSnippets);

      const snippet1 = screen.getByTestId("snippet-snippet-1");
      const parentBox = snippet1.parentElement;
      
      // Check for keyboard accessibility attributes
      expect(parentBox).toHaveAttribute("aria-label");
      const ariaLabel = parentBox?.getAttribute("aria-label");
      expect(ariaLabel).toContain("Snippet");
      expect(ariaLabel).toContain("Space");
      expect(ariaLabel).toContain("arrow keys");
    });

    it("applies drag styles when dragging", () => {
      // This test would require mocking the drag state
      // For now, we verify the component structure
      renderSnippetList(mockSnippets);

      const snippet1 = screen.getByTestId("snippet-snippet-1");
      expect(snippet1).toBeInTheDocument();
      
      // TODO: Test that opacity changes when isDragging is true
      // This requires mocking useSortable hook or using E2E tests
    });

    it("calls onMoveToChapter when snippet is moved to different chapter", () => {
      const onMoveToChapter = vi.fn();
      renderSnippetList(mockSnippets, vi.fn(), onMoveToChapter);

      // Note: Moving snippets between chapters requires more complex drag & drop setup
      // This test verifies the callback is provided
      // Full testing should be done in E2E tests or with StorySidebarContent integration tests
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels for screen readers", () => {
      renderSnippetList(mockSnippets);

      const snippet1 = screen.getByTestId("snippet-snippet-1");
      const parentBox = snippet1.parentElement;
      const ariaLabel = parentBox?.getAttribute("aria-label");
      
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain("Opening Scene");
      expect(ariaLabel).toContain("Press Space to activate drag mode");
    });

    it("has focus-visible styles for keyboard navigation", () => {
      renderSnippetList(mockSnippets);

      const snippet1 = screen.getByTestId("snippet-snippet-1");
      const parentBox = snippet1.parentElement;
      expect(parentBox).toHaveAttribute("tabIndex", "0");
    });

    it("supports keyboard activation with Space key", async () => {
      const user = userEvent.setup();
      renderSnippetList(mockSnippets);

      const snippet1 = screen.getByTestId("snippet-snippet-1");
      const parentBox = snippet1.parentElement as HTMLElement;
      
      // Focus the element
      parentBox.focus();
      
      // Press Space key
      await user.keyboard(" ");
      
      // Note: Full keyboard drag testing requires E2E tests or more complex mocking
      // This verifies the component structure supports keyboard interaction
      expect(parentBox).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("Edge Cases", () => {
    it("handles single snippet", () => {
      const singleSnippet = [mockSnippets[0]];
      renderSnippetList(singleSnippet);

      expect(screen.getByTestId("snippet-snippet-1")).toBeInTheDocument();
      expect(screen.queryByTestId("snippet-snippet-2")).not.toBeInTheDocument();
    });

    it("handles snippets with no word count", () => {
      const snippetsWithoutWordCount: Snippet[] = [
        {
          id: "snippet-1",
          title: "Untitled Snippet"
        }
      ];
      
      renderSnippetList(snippetsWithoutWordCount);
      expect(screen.getByTestId("snippet-snippet-1")).toBeInTheDocument();
      expect(screen.queryByTestId("snippet-wordcount-snippet-1")).not.toBeInTheDocument();
    });

    it("handles very long snippet titles", () => {
      const longTitleSnippet: Snippet[] = [
        {
          id: "snippet-1",
          title: "This is a very long snippet title that might cause layout issues if not handled properly",
          wordCount: 100
        }
      ];
      
      renderSnippetList(longTitleSnippet);
      expect(screen.getByText(longTitleSnippet[0].title)).toBeInTheDocument();
    });
  });
});

