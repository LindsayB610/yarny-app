import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { BackToStoriesLink } from "../../src/components/story/BackToStoriesLink";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe("BackToStoriesLink", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("navigates to /stories when clicked", async () => {
    render(
      <MemoryRouter initialEntries={["/react/editor"]}>
        <BackToStoriesLink />
      </MemoryRouter>
    );

    const link = screen.getByRole("link", { name: /back to stories/i });

    await userEvent.click(link);

    expect(mockNavigate).toHaveBeenCalledWith("/stories");
  });
});


