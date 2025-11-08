import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

import { StoriesHeader } from "./StoriesHeader";

describe("StoriesHeader", () => {
  const defaultProps = {
    onLogout: vi.fn(),
    onNewStory: vi.fn(),
    onRefresh: vi.fn(),
    onSearchChange: vi.fn(),
    searchQuery: ""
  };

  const renderHeader = (overrideProps: Partial<typeof defaultProps> = {}) =>
    render(
      <BrowserRouter>
        <StoriesHeader {...defaultProps} {...overrideProps} />
      </BrowserRouter>
    );

  it("renders header with title and subtitle", () => {
    renderHeader();

    expect(screen.getByText("Yarny")).toBeInTheDocument();
    expect(screen.getByText("Your writing projects")).toBeInTheDocument();
  });

  it("renders Your Stories heading", () => {
    renderHeader();

    expect(screen.getByText("Your Stories")).toBeInTheDocument();
  });

  it("renders search input", () => {
    renderHeader();

    const searchInput = screen.getByPlaceholderText(/Search stories/i);
    expect(searchInput).toBeInTheDocument();
  });

  it("calls onSearchChange when search input changes", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    renderHeader({ onSearchChange });

    const searchInput = screen.getByPlaceholderText(/Search stories/i);
    await user.type(searchInput, "test");

    expect(onSearchChange).toHaveBeenCalledTimes(4);
    expect(onSearchChange.mock.calls.map(([value]) => value)).toEqual([
      "t",
      "e",
      "s",
      "t"
    ]);
  });

  it("displays current search query in input", () => {
    renderHeader({ searchQuery: "My Story" });

    const searchInput = screen.getByPlaceholderText(/Search stories/i);
    expect(searchInput).toHaveValue("My Story");
  });

  it("renders refresh button", () => {
    renderHeader();

    const refreshButton = screen.getByRole("button", { name: /Refresh/i });
    expect(refreshButton).toBeInTheDocument();
  });

  it("calls onRefresh when refresh button is clicked", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    renderHeader({ onRefresh });

    const refreshButton = screen.getByRole("button", { name: /Refresh/i });
    await user.click(refreshButton);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("renders New Story button", () => {
    renderHeader();

    const newStoryButton = screen.getByRole("button", { name: /New Story/i });
    expect(newStoryButton).toBeInTheDocument();
  });

  it("calls onNewStory when New Story button is clicked", async () => {
    const user = userEvent.setup();
    const onNewStory = vi.fn();
    renderHeader({ onNewStory });

    const newStoryButton = screen.getByRole("button", { name: /New Story/i });
    await user.click(newStoryButton);

    expect(onNewStory).toHaveBeenCalledTimes(1);
  });

  it("renders Sign out button", () => {
    renderHeader();

    const signOutButton = screen.getByRole("button", { name: /Sign out/i });
    expect(signOutButton).toBeInTheDocument();
  });

  it("calls onLogout when Sign out button is clicked", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    renderHeader({ onLogout });

    const signOutButton = screen.getByRole("button", { name: /Sign out/i });
    await user.click(signOutButton);

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("renders Docs link", () => {
    renderHeader();

    const docsLink = screen.getByRole("link", { name: /Docs/i });
    expect(docsLink).toBeInTheDocument();
    expect(docsLink).toHaveAttribute("href", "/docs.html");
  });

  it("renders Settings link", () => {
    renderHeader();

    const settingsLink = screen.getByRole("link", { name: /Settings/i });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute("href", "/settings/storage");
  });
});


