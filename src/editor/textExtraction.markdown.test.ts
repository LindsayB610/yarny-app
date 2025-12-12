import { describe, expect, it } from "vitest";

import { markdownToPlainText } from "./textExtraction";

describe("markdownToPlainText", () => {
  it("removes bold markers", () => {
    expect(markdownToPlainText("This is **bold** text")).toBe("This is bold text");
    expect(markdownToPlainText("This is __bold__ text")).toBe("This is bold text");
  });

  it("removes italic markers", () => {
    expect(markdownToPlainText("This is *italic* text")).toBe("This is italic text");
    expect(markdownToPlainText("This is _italic_ text")).toBe("This is italic text");
  });

  it("removes headers", () => {
    expect(markdownToPlainText("# Header 1")).toBe("Header 1");
    expect(markdownToPlainText("## Header 2")).toBe("Header 2");
    expect(markdownToPlainText("### Header 3")).toBe("Header 3");
  });

  it("removes links but keeps link text", () => {
    expect(markdownToPlainText("[Link text](https://example.com)")).toBe("Link text");
    expect(markdownToPlainText("[Reference][ref]")).toBe("Reference");
  });

  it("removes inline code markers", () => {
    expect(markdownToPlainText("Use `code` in text")).toBe("Use code in text");
  });

  it("removes code blocks", () => {
    const input = "```\ncode block\n```";
    expect(markdownToPlainText(input)).toBe("code block");
  });

  it("removes list markers", () => {
    expect(markdownToPlainText("- Item 1\n- Item 2")).toBe("Item 1\nItem 2");
    expect(markdownToPlainText("* Item 1\n* Item 2")).toBe("Item 1\nItem 2");
    expect(markdownToPlainText("1. Item 1\n2. Item 2")).toBe("Item 1\nItem 2");
  });

  it("removes blockquotes", () => {
    expect(markdownToPlainText("> Quoted text")).toBe("Quoted text");
  });

  it("preserves plain text", () => {
    expect(markdownToPlainText("Just plain text")).toBe("Just plain text");
  });

  it("handles mixed markdown", () => {
    const input = "# Header\n\nThis is **bold** and *italic* text with a [link](url).";
    const expected = "Header\n\nThis is bold and italic text with a link.";
    expect(markdownToPlainText(input)).toBe(expected);
  });

  it("normalizes line endings", () => {
    expect(markdownToPlainText("Line 1\r\nLine 2")).toBe("Line 1\nLine 2");
  });
});

