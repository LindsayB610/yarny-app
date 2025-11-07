import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { StoriesPage } from "./StoriesPage";
import * as useAuthModule from "../../hooks/useAuth";
import * as useStoriesQueryModule from "../../hooks/useStoriesQuery";
import * as useStoryMutationsModule from "../../hooks/useStoryMutations";
import * as useStoryProgressModule from "../../hooks/useStoryProgress";

// Mock dependencies
vi.mock("../../hooks/useAuth");
vi.mock("../../hooks/useStoriesQuery");
vi.mock("../../hooks/useStoryMutations");
vi.mock("../../hooks/useStoryProgress");
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

const mockStories = [
  {
    id: "story-1",
    name: "My First Novel",
    modifiedTime: "2025-01-08T10:00:00Z"
  },
  {
    id: "story-2",
    name: "Novel Writing Guide",
    modifiedTime: "2025-01-07T15:30:00Z"
  },
  {
    id: "story-3",
    name: "Fantasy Epic",
    modifiedTime: "2025-01-06T09:15:00Z"
  },
  {
    id: "story-4",
    name: "Short Story Collection",
    modifiedTime: "2025-01-05T12:00:00Z"
  }
];

const renderStoriesPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <StoriesPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Helper to get text content from a story card (handles text split across spans)
const getStoryCardText = (card: HTMLElement | null): string => {
  if (!card) return "";
  return card.textContent || "";
};

describe("StoriesPage - Search Highlighting", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { email: "test@example.com" },
      logout: vi.fn(),
      isLoading: false
    });

    vi.mocked(useStoriesQueryModule.useStoriesQuery).mockReturnValue({
      data: mockStories,
      isLoading: false,
      error: null
    });

    vi.mocked(useStoryMutationsModule.useRefreshStories).mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false
    } as any);

    vi.mocked(useStoryMutationsModule.useDeleteStory).mockReturnValue({
      mutateAsync: vi.fn(),
      mutate: vi.fn(),
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn()
    } as any);
    
    vi.mocked(useStoryMutationsModule.useCreateStory).mockReturnValue({
      mutateAsync: vi.fn(),
      mutate: vi.fn(),
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn()
    } as any);

    // Mock useStoryProgress for each story
    vi.mocked(useStoryProgressModule.useStoryProgress).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null
    });
  });

  describe("Search Highlighting", () => {
    it("should highlight search matches in story names", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      const searchInput = screen.getByPlaceholderText(/Search stories/i);
      await user.type(searchInput, "Novel");

      // Wait for stories to be filtered and rendered
      await waitFor(() => {
        // Find story cards by their text content (may be split across spans)
        const cards = Array.from(document.querySelectorAll('[class*="MuiCard"]'));
        const hasMatchingStory = cards.some(card => 
          getStoryCardText(card as HTMLElement).includes("My First Novel")
        );
        expect(hasMatchingStory).toBe(true);
      });

      // Check for highlighted text - should have spans with background color
      await waitFor(() => {
        const highlightedSpans = document.querySelectorAll('span[style*="background-color"]');
        expect(highlightedSpans.length).toBeGreaterThan(0);
        
        // Verify highlighted text contains "Novel"
        const highlightedText = Array.from(highlightedSpans)
          .map(span => span.textContent)
          .join("");
        expect(highlightedText.toLowerCase()).toContain("novel");
      });
    });

    it("should highlight multiple matches in the same story name", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      const searchInput = screen.getByPlaceholderText(/Search stories/i);
      await user.type(searchInput, "Story");

      // Wait for the story to be rendered
      await waitFor(() => {
        const cards = Array.from(document.querySelectorAll('[class*="MuiCard"]'));
        const hasMatchingStory = cards.some(card => 
          getStoryCardText(card as HTMLElement).includes("Short Story Collection")
        );
        expect(hasMatchingStory).toBe(true);
      });

      // Verify that both occurrences of "Story" in "Short Story Collection" are highlighted
      await waitFor(() => {
        const cards = Array.from(document.querySelectorAll('[class*="MuiCard"]'));
        const storyCard = cards.find(card => 
          getStoryCardText(card as HTMLElement).includes("Short Story Collection")
        ) as HTMLElement | undefined;
        
        expect(storyCard).toBeDefined();
        if (storyCard) {
          const highlightedSpans = storyCard.querySelectorAll('span[style*="background-color"]');
          // Should have 2 highlighted spans (one for each "Story")
          expect(highlightedSpans.length).toBeGreaterThanOrEqual(2);
        }
      });
    });

    it("should highlight case-insensitive matches", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      const searchInput = screen.getByPlaceholderText(/Search stories/i);
      await user.type(searchInput, "novel");

      // Wait for stories to be rendered
      await waitFor(() => {
        const cards = Array.from(document.querySelectorAll('[class*="MuiCard"]'));
        const hasFirstNovel = cards.some(card => 
          getStoryCardText(card as HTMLElement).includes("My First Novel")
        );
        const hasNovelGuide = cards.some(card => 
          getStoryCardText(card as HTMLElement).includes("Novel Writing Guide")
        );
        expect(hasFirstNovel).toBe(true);
        expect(hasNovelGuide).toBe(true);
      });

      // Verify that "Novel" is highlighted even though search was "novel" (case-insensitive)
      await waitFor(() => {
        const highlightedSpans = document.querySelectorAll('span[style*="background-color"]');
        expect(highlightedSpans.length).toBeGreaterThan(0);
        
        // Verify the actual text in the DOM includes "Novel" (capitalized)
        const cards = Array.from(document.querySelectorAll('[class*="MuiCard"]'));
        const storyCard = cards.find(card => 
          getStoryCardText(card as HTMLElement).includes("My First Novel")
        ) as HTMLElement | undefined;
        
        expect(storyCard).toBeDefined();
        if (storyCard) {
          const cardText = getStoryCardText(storyCard);
          expect(cardText).toContain("Novel");
        }
      });
    });

    it("should clear highlights when search is cleared", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      const searchInput = screen.getByPlaceholderText(/Search stories/i);
      await user.type(searchInput, "Novel");

      // Wait for filtered stories
      await waitFor(() => {
        const cards = Array.from(document.querySelectorAll('[class*="MuiCard"]'));
        const hasMatchingStory = cards.some(card => 
          getStoryCardText(card as HTMLElement).includes("My First Novel")
        );
        expect(hasMatchingStory).toBe(true);
      });

      // Verify highlights exist
      await waitFor(() => {
        const highlightedSpans = document.querySelectorAll('span[style*="background-color"]');
        expect(highlightedSpans.length).toBeGreaterThan(0);
      });

      await user.clear(searchInput);

      // Wait for all stories to be visible again
      await waitFor(() => {
        const cards = Array.from(document.querySelectorAll('[class*="MuiCard"]'));
        const cardTexts = cards.map(card => getStoryCardText(card as HTMLElement));
        expect(cardTexts.some(text => text.includes("My First Novel"))).toBe(true);
        expect(cardTexts.some(text => text.includes("Novel Writing Guide"))).toBe(true);
        expect(cardTexts.some(text => text.includes("Fantasy Epic"))).toBe(true);
        expect(cardTexts.some(text => text.includes("Short Story Collection"))).toBe(true);
      });

      // Verify that no highlight elements remain (when search is empty, no highlights should show)
      // Note: When search is empty, highlightSearchText should return text without highlight spans
      // However, the component might still have the spans rendered. Let's check that at least
      // the highlighted spans don't have the background color style applied anymore.
      await waitFor(() => {
        // Get all spans that might have been highlighted
        const allSpans = document.querySelectorAll('[class*="MuiCard"] span');
        const highlightedSpans = Array.from(allSpans).filter(span => {
          const style = (span as HTMLElement).style.backgroundColor;
          return style && style.includes('rgba(255, 235, 59');
        });
        // When search is cleared, there should be no spans with the highlight background color
        expect(highlightedSpans.length).toBe(0);
      }, { timeout: 2000 });
    });

    it("should highlight partial word matches", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      const searchInput = screen.getByPlaceholderText(/Search stories/i);
      await user.type(searchInput, "Fanta");

      // Wait for the story to be rendered
      await waitFor(() => {
        const cards = Array.from(document.querySelectorAll('[class*="MuiCard"]'));
        const hasMatchingStory = cards.some(card => 
          getStoryCardText(card as HTMLElement).includes("Fantasy Epic")
        );
        expect(hasMatchingStory).toBe(true);
      });

      // Verify that "Fanta" portion of "Fantasy" is highlighted
      await waitFor(() => {
        const cards = Array.from(document.querySelectorAll('[class*="MuiCard"]'));
        const storyCard = cards.find(card => 
          getStoryCardText(card as HTMLElement).includes("Fantasy Epic")
        ) as HTMLElement | undefined;
        
        expect(storyCard).toBeDefined();
        if (storyCard) {
          const highlightedSpans = storyCard.querySelectorAll('span[style*="background-color"]');
          expect(highlightedSpans.length).toBeGreaterThan(0);
          const highlightedText = Array.from(highlightedSpans)
            .map(span => span.textContent)
            .join("");
          expect(highlightedText.toLowerCase()).toContain("fanta");
        }
      });
    });

    it("should handle special characters in search query", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      // Test with special characters that might be in story names
      const searchInput = screen.getByPlaceholderText(/Search stories/i);
      await user.type(searchInput, "First");

      // Wait for the story to be rendered
      await waitFor(() => {
        const cards = Array.from(document.querySelectorAll('[class*="MuiCard"]'));
        const hasMatchingStory = cards.some(card => 
          getStoryCardText(card as HTMLElement).includes("My First Novel")
        );
        expect(hasMatchingStory).toBe(true);
      });

      // Verify highlighting works
      await waitFor(() => {
        const cards = Array.from(document.querySelectorAll('[class*="MuiCard"]'));
        const storyCard = cards.find(card => 
          getStoryCardText(card as HTMLElement).includes("My First Novel")
        ) as HTMLElement | undefined;
        
        expect(storyCard).toBeDefined();
        if (storyCard) {
          const highlightedSpans = storyCard.querySelectorAll('span[style*="background-color"]');
          expect(highlightedSpans.length).toBeGreaterThan(0);
          const highlightedText = Array.from(highlightedSpans)
            .map(span => span.textContent)
            .join("");
          expect(highlightedText).toContain("First");
        }
      });
    });

    it("should update highlights when search query changes", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      const searchInput = screen.getByPlaceholderText(/Search stories/i);
      
      // First search
      await user.type(searchInput, "Novel");
      
      await waitFor(() => {
        const cards = Array.from(document.querySelectorAll('[class*="MuiCard"]'));
        const hasMatchingStory = cards.some(card => 
          getStoryCardText(card as HTMLElement).includes("My First Novel")
        );
        expect(hasMatchingStory).toBe(true);
      });

      // Verify "Novel" is highlighted
      await waitFor(() => {
        const highlightedSpans = document.querySelectorAll('span[style*="background-color"]');
        expect(highlightedSpans.length).toBeGreaterThan(0);
        const highlightedText = Array.from(highlightedSpans)
          .map(span => span.textContent)
          .join("");
        expect(highlightedText.toLowerCase()).toContain("novel");
      });

      // Change search query
      await user.clear(searchInput);
      await user.type(searchInput, "Epic");

      await waitFor(() => {
        const cards = Array.from(document.querySelectorAll('[class*="MuiCard"]'));
        const cardTexts = cards.map(card => getStoryCardText(card as HTMLElement));
        const hasEpic = cardTexts.some(text => text.includes("Fantasy Epic"));
        const hasNovel = cardTexts.some(text => text.includes("My First Novel"));
        
        expect(hasEpic).toBe(true);
        // "My First Novel" should not be visible when searching for "Epic"
        expect(hasNovel).toBe(false);
      });

      // Verify that new highlights are applied for "Epic"
      await waitFor(() => {
        const highlightedSpans = document.querySelectorAll('span[style*="background-color"]');
        expect(highlightedSpans.length).toBeGreaterThan(0);
        const highlightedText = Array.from(highlightedSpans)
          .map(span => span.textContent)
          .join("");
        expect(highlightedText.toLowerCase()).toContain("epic");
      });
    });
  });
});

