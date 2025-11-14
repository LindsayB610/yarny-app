import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../tests/utils/test-utils";
import { LoadingState } from "./LoadingState";

describe("LoadingState", () => {
  it("renders loading spinner and message", () => {
    renderWithProviders(<LoadingState />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByText(/loading stories/i)).toBeInTheDocument();
  });
});

