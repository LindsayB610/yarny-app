import { describe, it, expect, vi, beforeEach } from "vitest";

import type * as ReactRouterDom from "react-router-dom";

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

vi.mock("../../hooks/useAuth");
vi.mock("../../hooks/useStoriesQuery");
vi.mock("../../hooks/useStoryMutations");

const mockUseLoaderData = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLoaderData: () => mockUseLoaderData()
  };
});

const mockStories = [
  { id: "story-1", name: "My First Novel", modifiedTime: "2025-01-08T10:00:00Z" },
  { id: "story-2", name: "Short Story Collection", modifiedTime: "2025-01-07T15:30:00Z" },
  { id: "story-3", name: "Fantasy Epic", modifiedTime: "2025-01-06T09:15:00Z" }
];

const getStoryTitleNodes = (title: string) =>
  screen.getAllByText((_, node) => node?.textContent === title);
const expectStoryVisible = (title: string) => {
  expect(getStoryTitleNodes(title).length).toBeGreaterThan(0);
};

const renderStoriesPage = () => {
  return renderWithProviders(<StoriesPage />);
};

describe("StoriesPage", () => {
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
  });

  describe("Story Management", () => {
    it("renders list of stories", () => {
      renderStoriesPage();

      expectStoryVisible("My First Novel");
      expectStoryVisible("Short Story Collection");
      expectStoryVisible("Fantasy Epic");
    });

    it("displays empty state when no stories exist", () => {
      vi.mocked(useStoriesQueryModule.useStoriesQuery).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      });

      renderStoriesPage();

      expect(screen.getByText(/No stories yet/i)).toBeInTheDocument();
    });

    it("displays loading state while fetching stories", () => {
      vi.mocked(useStoriesQueryModule.useStoriesQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null
      });

      renderStoriesPage();

      expect(screen.getByText(/Loading stories/i)).toBeInTheDocument();
    });

    it("displays Drive auth prompt when not authorized", () => {
      mockUseLoaderData.mockReturnValue({ driveAuthorized: false });
      vi.mocked(useStoriesQueryModule.useStoriesQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Not authorized")
      });

      renderStoriesPage();

      expect(screen.getByText(/Connect to Google Drive/i)).toBeInTheDocument();
    });
  });

  describe("Modal Behavior", () => {
    it("opens new story modal when New Story button is clicked", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      const newStoryButton = screen.getByRole("button", { name: /New Story/i });
      await user.click(newStoryButton);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Create New Story/i })).toBeInTheDocument();
      });
    });

    it("closes new story modal when cancel button is clicked", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      const newStoryButton = screen.getByRole("button", { name: /New Story/i });
      await user.click(newStoryButton);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Create New Story/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: /Create New Story/i })).not.toBeInTheDocument();
      });
    });

    it("opens delete modal when delete button is clicked on a story card", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      const deleteButton = screen
        .getAllByRole("button")
        .find((button) => button.querySelector('svg[data-testid="CloseIcon"]'));

      if (!deleteButton) {
        throw new Error("Delete button not found");
      }

      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Delete Story/i })).toBeInTheDocument();
      });
    });
  });

  describe("Refresh Functionality", () => {
    it("calls refresh when refresh button is clicked", async () => {
      const user = userEvent.setup();
      const mockRefresh = vi.fn();
      vi.mocked(useStoryMutationsModule.useRefreshStories).mockReturnValue({
        mutateAsync: mockRefresh,
        isLoading: false
      } as any);

      renderStoriesPage();

      const refreshButton = screen.getByRole("button", { name: /Refresh/i });
      await user.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe("Navigation", () => {
    it("redirects to login when user is not authenticated", () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        logout: vi.fn(),
        isLoading: false
      });

      renderStoriesPage();

      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });
});
