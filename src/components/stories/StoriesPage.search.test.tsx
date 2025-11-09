import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  renderWithProviders,
  screen,
  waitFor,
  userEvent
} from "../../../tests/utils/test-utils";

import { StoriesPage } from "./StoriesPage";
import * as useAuthModule from "../../hooks/useAuth";
import * as useStoriesQueryModule from "../../hooks/useStoriesQuery";
import * as useStoryMutationsModule from "../../hooks/useStoryMutations";
import * as useStoryProgressModule from "../../hooks/useStoryProgress";

vi.mock("../../hooks/useAuth");
vi.mock("../../hooks/useStoriesQuery");
vi.mock("../../hooks/useStoryMutations");
vi.mock("../../hooks/useStoryProgress");

const mockUseLoaderData = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLoaderData: () => mockUseLoaderData()
  };
});

const mockStories = [
  { id: "story-1", name: "My First Novel", modifiedTime: "2025-01-08T10:00:00Z" },
  { id: "story-2", name: "Novel (Guide)", modifiedTime: "2025-01-07T15:30:00Z" },
  { id: "story-3", name: "Fantasy Epic", modifiedTime: "2025-01-06T09:15:00Z" },
  { id: "story-4", name: "Short Story Collection", modifiedTime: "2025-01-05T12:00:00Z" }
];

const renderStoriesPage = () => renderWithProviders(<StoriesPage />);

const getCards = () => Array.from(document.querySelectorAll('[class*="MuiCard"]'));
const getStoryCardText = (element: Element | null): string => element?.textContent ?? "";
const getHighlightedSpans = () =>
  Array.from(document.querySelectorAll('span[style*="background-color"]')).filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element.style.backgroundColor !== "transparent"
  );

describe("StoriesPage - Search Highlighting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    mockUseLoaderData.mockReset();
    mockUseLoaderData.mockReturnValue({ driveAuthorized: true });

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

    vi.mocked(useStoryMutationsModule.useCreateStory).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false
    } as any);

    vi.mocked(useStoryMutationsModule.useDeleteStory).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false
    } as any);

    vi.mocked(useStoryProgressModule.useStoryProgress).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null
    });
  });

  it("highlights matches in story names", async () => {
    const user = userEvent.setup();
    renderStoriesPage();

    await user.type(screen.getByPlaceholderText(/Search stories/i), "Novel");

    await waitFor(() => {
      expect(
        getCards().some((card) => getStoryCardText(card).includes("My First Novel"))
      ).toBe(true);
    });

    await waitFor(() => {
      const highlighted = getHighlightedSpans()
        .map((span) => span.textContent?.toLowerCase() ?? "")
        .join("");
      expect(highlighted).toContain("novel");
    });
  });

  it("highlights multiple matches within the same name", async () => {
    const user = userEvent.setup();
    renderStoriesPage();

    await user.type(screen.getByPlaceholderText(/Search stories/i), "Story");

    await waitFor(() => {
      const storyCard = getCards().find((card) =>
        getStoryCardText(card).includes("Short Story Collection")
      ) as HTMLElement | undefined;
      expect(storyCard).toBeDefined();
      const highlightCount = storyCard
        ? storyCard.querySelectorAll('span[style*="background-color"]').length
        : 0;
      expect(highlightCount).toBeGreaterThanOrEqual(2);
    });
  });

  it("is case-insensitive", async () => {
    const user = userEvent.setup();
    renderStoriesPage();

    await user.type(screen.getByPlaceholderText(/Search stories/i), "novel");

    await waitFor(() => {
      const cards = getCards();
      expect(cards.some((card) => getStoryCardText(card).includes("My First Novel"))).toBe(
        true
      );
      expect(
            cards.some((card) => getStoryCardText(card).includes("Novel (Guide)"))
      ).toBe(true);
    });
  });

  it("supports partial word matches", async () => {
    const user = userEvent.setup();
    renderStoriesPage();

    await user.type(screen.getByPlaceholderText(/Search stories/i), "ovel");

    await waitFor(() => {
      const highlighted = getHighlightedSpans()
        .map((span) => span.textContent?.toLowerCase() ?? "")
        .join("");
      expect(highlighted).toContain("ovel");
    });
  });

  it("handles special characters", async () => {
    const user = userEvent.setup();
    renderStoriesPage();

    await user.type(screen.getByPlaceholderText(/Search stories/i), "Novel (Guide)");

    await waitFor(() => {
      const highlighted = getHighlightedSpans()
        .map((span) => span.textContent ?? "")
        .join("")
        .toLowerCase();
      expect(highlighted).toContain("novel");
    });
  });

  it("updates highlights when the query changes", async () => {
    const user = userEvent.setup();
    renderStoriesPage();
    const searchInput = screen.getByPlaceholderText(/Search stories/i);

    await user.type(searchInput, "novel");
    await waitFor(() => expect(getHighlightedSpans().length).toBeGreaterThan(0));

    await user.clear(searchInput);
    await user.type(searchInput, "Fantasy");

    await waitFor(() => {
      const highlighted = getHighlightedSpans()
        .map((span) => span.textContent?.toLowerCase() ?? "")
        .join("");
      expect(highlighted).toContain("fantasy");
      expect(highlighted).not.toContain("novel");
    });
  });

  it("clears highlights when the search is cleared", async () => {
    const user = userEvent.setup();
    renderStoriesPage();
    const searchInput = screen.getByPlaceholderText(/Search stories/i);

    await user.type(searchInput, "novel");
    await waitFor(() => expect(getHighlightedSpans().length).toBeGreaterThan(0));

    await user.clear(searchInput);

    await waitFor(() => {
      expect(getHighlightedSpans().length).toBe(0);
    });
  });
});
