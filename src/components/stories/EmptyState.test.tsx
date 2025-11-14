import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/utils/test-utils";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders empty state message", () => {
    const onNewStory = vi.fn();
    renderWithProviders(<EmptyState onNewStory={onNewStory} />);

    expect(screen.getByText(/no stories yet/i)).toBeInTheDocument();
    expect(screen.getByText(/create your first story to get started/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create your first story/i })).toBeInTheDocument();
  });

  it("calls onNewStory when button is clicked", async () => {
    const user = userEvent.setup();
    const onNewStory = vi.fn();
    renderWithProviders(<EmptyState onNewStory={onNewStory} />);

    const button = screen.getByRole("button", { name: /create your first story/i });
    await user.click(button);

    expect(onNewStory).toHaveBeenCalledTimes(1);
  });
});

