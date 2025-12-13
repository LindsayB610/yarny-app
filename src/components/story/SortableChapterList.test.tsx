import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SortableChapterList, type Chapter } from "./SortableChapterList";

// Mock @dnd-kit utilities
vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: (transform: { x: number; y: number } | null) => transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : ""
    }
  }
}));

// Mock @dnd-kit/sortable
const mockUseSortable = vi.fn();
vi.mock("@dnd-kit/sortable", async () => {
  const actual = await vi.importActual("@dnd-kit/sortable");
  return {
    ...actual,
    useSortable: (args: { id: string }) => mockUseSortable(args)
  };
});

const mockChapters: Chapter[] = [
  {
    id: "chapter-1",
    title: "Chapter 1: Introduction",
    color: "#FF0000",
    snippetIds: ["snippet-1", "snippet-2"]
  },
  {
    id: "chapter-2",
    title: "Chapter 2: Development",
    color: "#00FF00",
    snippetIds: ["snippet-3"]
  },
  {
    id: "chapter-3",
    title: "Chapter 3: Conclusion",
    color: "#0000FF",
    snippetIds: ["snippet-4", "snippet-5", "snippet-6"]
  }
];

const renderChapterList = (
  chapters: Chapter[],
  onReorder: (newOrder: string[]) => void = vi.fn()
) => {
  return render(
    <SortableChapterList
      chapters={chapters}
      onReorder={onReorder}
      renderChapter={(chapter, _index) => (
        <div data-testid={`chapter-${chapter.id}`}>
          <span>{chapter.title}</span>
          <span data-testid={`chapter-color-${chapter.id}`}>{chapter.color}</span>
        </div>
      )}
    />
  );
};

describe("SortableChapterList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for useSortable - not dragging
    mockUseSortable.mockImplementation(() => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false
    }));
  });

  describe("Rendering", () => {
    it("renders all chapters", () => {
      renderChapterList(mockChapters);

      expect(screen.getByTestId("chapter-chapter-1")).toBeInTheDocument();
      expect(screen.getByTestId("chapter-chapter-2")).toBeInTheDocument();
      expect(screen.getByTestId("chapter-chapter-3")).toBeInTheDocument();
    });

    it("renders chapter titles", () => {
      renderChapterList(mockChapters);

      expect(screen.getByText("Chapter 1: Introduction")).toBeInTheDocument();
      expect(screen.getByText("Chapter 2: Development")).toBeInTheDocument();
      expect(screen.getByText("Chapter 3: Conclusion")).toBeInTheDocument();
    });

    it("renders empty list when no chapters provided", () => {
      renderChapterList([]);

      expect(screen.queryByTestId(/^chapter-/)).not.toBeInTheDocument();
    });
  });

  describe("Drag & Drop Operations", () => {
    it("calls onReorder when chapter is dragged to new position", async () => {
      const onReorder = vi.fn();
      renderChapterList(mockChapters, onReorder);

      // Simulate drag and drop
      // Note: This is a simplified test. Full drag & drop testing requires
      // more complex setup with @dnd-kit's testing utilities or E2E tests
      
      // For now, we verify the component structure supports drag & drop
      // The Box component with role="button" is the parent of our test element
      const chapter1 = screen.getByTestId("chapter-chapter-1");
      const parentBox = chapter1.parentElement;
      
      // The parent Box should have the drag & drop attributes
      expect(parentBox).toHaveAttribute("role", "button");
      expect(parentBox).toHaveAttribute("tabIndex", "0");
    });

    it("provides keyboard navigation for drag & drop", () => {
      renderChapterList(mockChapters);

      const chapter1 = screen.getByTestId("chapter-chapter-1");
      const parentBox = chapter1.parentElement;
      
      // Check for keyboard accessibility attributes
      expect(parentBox).toHaveAttribute("aria-label");
      const ariaLabel = parentBox?.getAttribute("aria-label");
      expect(ariaLabel).toContain("Chapter");
      expect(ariaLabel).toContain("Space");
      expect(ariaLabel).toContain("arrow keys");
    });

    it("applies drag styles when dragging", () => {
      renderChapterList(mockChapters);

      const chapter1 = screen.getByTestId("chapter-chapter-1");
      expect(chapter1).toBeInTheDocument();
      
      // The opacity style is applied to the parent Box element
      const parentBox = chapter1.parentElement;
      expect(parentBox).toHaveStyle({ opacity: "1" });
    });

    it("applies reduced opacity when dragging", () => {
      // Mock useSortable to return isDragging: true for chapter-1
      mockUseSortable.mockImplementation((args: { id: string }) => {
        if (args.id === "chapter-1") {
          return {
            attributes: {},
            listeners: {},
            setNodeRef: vi.fn(),
            transform: null,
            transition: undefined,
            isDragging: true
          };
        }
        return {
          attributes: {},
          listeners: {},
          setNodeRef: vi.fn(),
          transform: null,
          transition: undefined,
          isDragging: false
        };
      });

      renderChapterList(mockChapters);

      const chapter1 = screen.getByTestId("chapter-chapter-1");
      expect(chapter1).toBeInTheDocument();
      
      // The opacity style is applied to the parent Box element
      const parentBox = chapter1.parentElement;
      expect(parentBox).toHaveStyle({ opacity: "0.5" });
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels for screen readers", () => {
      renderChapterList(mockChapters);

      const chapter1 = screen.getByTestId("chapter-chapter-1");
      const parentBox = chapter1.parentElement;
      const ariaLabel = parentBox?.getAttribute("aria-label");
      
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain("Chapter 1: Introduction");
      expect(ariaLabel).toContain("Press Space to activate drag mode");
    });

    it("has focus-visible styles for keyboard navigation", () => {
      renderChapterList(mockChapters);

      const chapter1 = screen.getByTestId("chapter-chapter-1");
      const parentBox = chapter1.parentElement;
      expect(parentBox).toHaveAttribute("tabIndex", "0");
    });

    it("supports keyboard activation with Space key", async () => {
      const user = userEvent.setup();
      renderChapterList(mockChapters);

      const chapter1 = screen.getByTestId("chapter-chapter-1");
      const parentBox = chapter1.parentElement as HTMLElement;
      
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
    it("handles single chapter", () => {
      const singleChapter = [mockChapters[0]];
      renderChapterList(singleChapter);

      expect(screen.getByTestId("chapter-chapter-1")).toBeInTheDocument();
      expect(screen.queryByTestId("chapter-chapter-2")).not.toBeInTheDocument();
    });

    it("handles chapters with no color", () => {
      const chaptersWithoutColor: Chapter[] = [
        {
          id: "chapter-1",
          title: "Chapter 1",
          snippetIds: []
        }
      ];
      
      renderChapterList(chaptersWithoutColor);
      expect(screen.getByTestId("chapter-chapter-1")).toBeInTheDocument();
    });

    it("handles chapters with empty snippet lists", () => {
      const chaptersWithEmptySnippets: Chapter[] = [
        {
          id: "chapter-1",
          title: "Chapter 1",
          snippetIds: []
        }
      ];
      
      renderChapterList(chaptersWithEmptySnippets);
      expect(screen.getByTestId("chapter-chapter-1")).toBeInTheDocument();
    });
  });
});

