import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWordCount } from "./useWordCount";

describe("useWordCount", () => {
  it("calculates word count correctly", () => {
    const { result } = renderHook(() => useWordCount());

    expect(result.current.calculateWordCount("Hello world")).toBe(2);
    expect(result.current.calculateWordCount("One two three")).toBe(3);
    expect(result.current.calculateWordCount("")).toBe(0);
    expect(result.current.calculateWordCount("   ")).toBe(0);
  });

  it("handles multiple spaces correctly", () => {
    const { result } = renderHook(() => useWordCount());

    expect(result.current.calculateWordCount("Hello    world")).toBe(2);
    expect(result.current.calculateWordCount("  One   two   three  ")).toBe(3);
  });

  it("handles newlines correctly", () => {
    const { result } = renderHook(() => useWordCount());

    expect(result.current.calculateWordCount("Hello\nworld")).toBe(2);
    expect(result.current.calculateWordCount("One\ntwo\nthree")).toBe(3);
  });

  it("calculates total word count from multiple texts", () => {
    const { result } = renderHook(() => useWordCount());

    expect(result.current.calculateTotalWordCount(["Hello", "world", "test"])).toBe(3);
    expect(result.current.calculateTotalWordCount(["One two", "three four", "five"])).toBe(5);
    expect(result.current.calculateTotalWordCount([])).toBe(0);
  });

  it("updates snippet word count", () => {
    const { result } = renderHook(() => useWordCount());
    const onUpdate = vi.fn();

    const wordCount = result.current.updateSnippetWordCount("snippet-1", "Hello world test", onUpdate);

    expect(wordCount).toBe(3);
    expect(onUpdate).toHaveBeenCalledWith("snippet-1", 3);
  });

  it("handles empty text in updateSnippetWordCount", () => {
    const { result } = renderHook(() => useWordCount());
    const onUpdate = vi.fn();

    const wordCount = result.current.updateSnippetWordCount("snippet-1", "", onUpdate);

    expect(wordCount).toBe(0);
    expect(onUpdate).toHaveBeenCalledWith("snippet-1", 0);
  });

  it("handles special characters", () => {
    const { result } = renderHook(() => useWordCount());

    expect(result.current.calculateWordCount("Hello, world!")).toBe(2);
    expect(result.current.calculateWordCount("It's a test")).toBe(3);
    expect(result.current.calculateWordCount("123 456 789")).toBe(3);
  });

  it("handles unicode characters", () => {
    const { result } = renderHook(() => useWordCount());

    expect(result.current.calculateWordCount("Hello 世界")).toBe(2);
    expect(result.current.calculateWordCount("مرحبا hello")).toBe(2);
  });
});

