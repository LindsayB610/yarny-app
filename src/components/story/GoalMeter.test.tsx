import { describe, expect, it, vi } from "vitest";

import { GoalMeter } from "./GoalMeter";
import { renderWithProviders, screen, userEvent } from "../../../tests/utils/test-utils";

describe("GoalMeter", () => {
  it("displays word count and goal", () => {
    renderWithProviders(<GoalMeter totalWords={1500} goal={3000} />);

    expect(screen.getByText("1,500 / 3,000")).toBeInTheDocument();
  });

  it("calculates percentage correctly", () => {
    renderWithProviders(<GoalMeter totalWords={1500} goal={3000} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "50");
  });

  it("caps percentage at 100%", () => {
    renderWithProviders(<GoalMeter totalWords={5000} goal={3000} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "100");
  });

  it("handles zero goal", () => {
    renderWithProviders(<GoalMeter totalWords={1000} goal={0} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
  });

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<GoalMeter totalWords={1500} goal={3000} onClick={handleClick} />);

    const meter = screen.getByRole("button");
    await user.click(meter);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick on Enter key", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<GoalMeter totalWords={1500} goal={3000} onClick={handleClick} />);

    const meter = screen.getByRole("button");
    meter.focus();
    await user.keyboard("{Enter}");

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick on Space key", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<GoalMeter totalWords={1500} goal={3000} onClick={handleClick} />);

    const meter = screen.getByRole("button");
    meter.focus();
    await user.keyboard(" ");

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not render as button when onClick is not provided", () => {
    renderWithProviders(<GoalMeter totalWords={1500} goal={3000} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("formats large numbers with commas", () => {
    renderWithProviders(<GoalMeter totalWords={1234567} goal={2000000} />);

    expect(screen.getByText("1,234,567 / 2,000,000")).toBeInTheDocument();
  });
});

