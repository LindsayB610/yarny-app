import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MigrationProgressDialog } from "./MigrationProgressDialog";
import type { MigrationProgress } from "../../services/migration";

describe("MigrationProgressDialog", () => {
  const baseProgress: MigrationProgress = {
    totalStories: 5,
    completedStories: 0,
    currentStory: null,
    errors: []
  };

  it("should render migration dialog when open", () => {
    render(
      <MigrationProgressDialog open={true} progress={baseProgress} />
    );

    expect(screen.getByText("Migrating Stories to JSON")).toBeInTheDocument();
    expect(
      screen.getByText(/Migrating 5 stories to JSON format/)
    ).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <MigrationProgressDialog open={false} progress={baseProgress} />
    );

    expect(
      screen.queryByText("Migrating Stories to JSON")
    ).not.toBeInTheDocument();
  });

  it("should show progress percentage", () => {
    const progress: MigrationProgress = {
      ...baseProgress,
      completedStories: 2
    };

    render(<MigrationProgressDialog open={true} progress={progress} />);

    expect(screen.getByText(/2 \/ 5 stories completed \(40%\)/)).toBeInTheDocument();
  });

  it("should show current story being migrated", () => {
    const progress: MigrationProgress = {
      ...baseProgress,
      currentStory: "My Story"
    };

    render(<MigrationProgressDialog open={true} progress={progress} />);

    expect(screen.getByText("Current: My Story")).toBeInTheDocument();
  });

  it("should show errors when they occur", () => {
    const progress: MigrationProgress = {
      ...baseProgress,
      completedStories: 3,
      errors: [
        { storyId: "story-1", error: "Failed to read data.json" },
        { storyId: "story-2", error: "Network error" }
      ]
    };

    render(<MigrationProgressDialog open={true} progress={progress} />);

    expect(
      screen.getByText(/2 error\(s\) occurred/)
    ).toBeInTheDocument();
  });

  it("should show 0% when no stories completed", () => {
    render(<MigrationProgressDialog open={true} progress={baseProgress} />);

    expect(screen.getByText(/0 \/ 5 stories completed \(0%\)/)).toBeInTheDocument();
  });

  it("should show 100% when all stories completed", () => {
    const progress: MigrationProgress = {
      ...baseProgress,
      completedStories: 5
    };

    render(<MigrationProgressDialog open={true} progress={progress} />);

    expect(screen.getByText(/5 \/ 5 stories completed \(100%\)/)).toBeInTheDocument();
  });
});


