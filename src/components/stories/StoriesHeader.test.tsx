import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("renders header with title and subtitle", () => {
    render(<StoriesHeader {...defaultProps} />);

    expect(screen.getByText("Yarny")).toBeInTheDocument();
    expect(screen.getByText("Your writing projects")).toBeInTheDocument();
  });

  it("renders Your Stories heading", () => {
    render(<StoriesHeader {...defaultProps} />);

    expect(screen.getByText("Your Stories")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<StoriesHeader {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/Search stories/i);
    expect(searchInput).toBeInTheDocument();
  });

  it("calls onSearchChange when search input changes", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(<StoriesHeader {...defaultProps} onSearchChange={onSearchChange} />);

    const searchInput = screen.getByPlaceholderText(/Search stories/i);
    await user.type(searchInput, "test");

    expect(onSearchChange).toHaveBeenCalledWith("test");
  });

  it("displays current search query in input", () => {
    render(<StoriesHeader {...defaultProps} searchQuery="My Story" />);

    const searchInput = screen.getByPlaceholderText(/Search stories/i);
    expect(searchInput).toHaveValue("My Story");
  });

  it("renders refresh button", () => {
    render(<StoriesHeader {...defaultProps} />);

    const refreshButton = screen.getByRole("button", { name: /Refresh/i });
    expect(refreshButton).toBeInTheDocument();
  });

  it("calls onRefresh when refresh button is clicked", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(<StoriesHeader {...defaultProps} onRefresh={onRefresh} />);

    const refreshButton = screen.getByRole("button", { name: /Refresh/i });
    await user.click(refreshButton);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("renders New Story button", () => {
    render(<StoriesHeader {...defaultProps} />);

    const newStoryButton = screen.getByRole("button", { name: /New Story/i });
    expect(newStoryButton).toBeInTheDocument();
  });

  it("calls onNewStory when New Story button is clicked", async () => {
    const user = userEvent.setup();
    const onNewStory = vi.fn();
    render(<StoriesHeader {...defaultProps} onNewStory={onNewStory} />);

    const newStoryButton = screen.getByRole("button", { name: /New Story/i });
    await user.click(newStoryButton);

    expect(onNewStory).toHaveBeenCalledTimes(1);
  });

  it("renders Sign out button", () => {
    render(<StoriesHeader {...defaultProps} />);

    const signOutButton = screen.getByRole("button", { name: /Sign out/i });
    expect(signOutButton).toBeInTheDocument();
  });

  it("calls onLogout when Sign out button is clicked", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<StoriesHeader {...defaultProps} onLogout={onLogout} />);

    const signOutButton = screen.getByRole("button", { name: /Sign out/i });
    await user.click(signOutButton);

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("renders Docs link", () => {
    render(<StoriesHeader {...defaultProps} />);

    const docsLink = screen.getByRole("link", { name: /Docs/i });
    expect(docsLink).toBeInTheDocument();
    expect(docsLink).toHaveAttribute("href", "/docs.html");
  });
});


