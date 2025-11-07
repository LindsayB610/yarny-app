import { describe, it, expect } from "vitest";

import { highlightSearchText } from "./highlightSearch";

describe("highlightSearchText", () => {
  it("returns original text when search query is empty", () => {
    const result = highlightSearchText("My Story", "");
    expect(result).toEqual([{ text: "My Story", highlight: false }]);
  });

  it("returns original text when search query is whitespace", () => {
    const result = highlightSearchText("My Story", "   ");
    expect(result).toEqual([{ text: "My Story", highlight: false }]);
  });

  it("highlights exact match", () => {
    const result = highlightSearchText("My Story", "Story");
    expect(result).toEqual([
      { text: "My ", highlight: false },
      { text: "Story", highlight: true }
    ]);
  });

  it("highlights case-insensitive match", () => {
    const result = highlightSearchText("My Story", "story");
    expect(result).toEqual([
      { text: "My ", highlight: false },
      { text: "Story", highlight: true }
    ]);
  });

  it("highlights multiple matches", () => {
    const result = highlightSearchText("Story Story Story", "Story");
    expect(result).toEqual([
      { text: "Story", highlight: true },
      { text: " ", highlight: false },
      { text: "Story", highlight: true },
      { text: " ", highlight: false },
      { text: "Story", highlight: true }
    ]);
  });

  it("highlights partial word match", () => {
    const result = highlightSearchText("Fantasy Epic", "Fanta");
    expect(result).toEqual([
      { text: "Fanta", highlight: true },
      { text: "sy Epic", highlight: false }
    ]);
  });

  it("highlights match at start of text", () => {
    const result = highlightSearchText("My Story", "My");
    expect(result).toEqual([
      { text: "My", highlight: true },
      { text: " Story", highlight: false }
    ]);
  });

  it("highlights match at end of text", () => {
    const result = highlightSearchText("My Story", "Story");
    expect(result).toEqual([
      { text: "My ", highlight: false },
      { text: "Story", highlight: true }
    ]);
  });

  it("returns original text when no match found", () => {
    const result = highlightSearchText("My Story", "Novel");
    expect(result).toEqual([{ text: "My Story", highlight: false }]);
  });

  it("handles special characters in search query", () => {
    const result = highlightSearchText("Story: Chapter 1", ":");
    expect(result).toEqual([
      { text: "Story", highlight: false },
      { text: ":", highlight: true },
      { text: " Chapter 1", highlight: false }
    ]);
  });

  it("handles empty text", () => {
    const result = highlightSearchText("", "search");
    expect(result).toEqual([{ text: "", highlight: false }]);
  });
});


