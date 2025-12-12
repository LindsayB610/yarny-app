import { describe, expect, it } from "vitest";

import {
  buildPlainTextDocument,
  extractPlainTextFromDocument,
  normalizePlainText
} from "./textExtraction";

describe("textExtraction utilities", () => {
  it("normalizes whitespace and line endings", () => {
    expect(normalizePlainText("hello\r\nworld\u00A0")).toBe("hello\nworld");
  });

  it("builds a TipTap document with paragraphs and hard breaks", () => {
    const doc = buildPlainTextDocument("Line one\nLine two\n\nNext paragraph");

    // With new behavior: single newlines become hard breaks within paragraphs,
    // double newlines create paragraph breaks
    expect(doc).toMatchObject({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Line one" },
            { type: "hardBreak" },
            { type: "text", text: "Line two" }
          ]
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Next paragraph" }]
        }
      ]
    });
  });

  it("extracts normalized plain text from a TipTap document", () => {
    const doc = buildPlainTextDocument("First paragraph\n\nSecond paragraph");
    const text = extractPlainTextFromDocument(doc);
    // Should preserve paragraph breaks (double newlines)
    expect(text).toBe("First paragraph\n\nSecond paragraph");
  });

  it("extracts text with hard breaks within paragraphs", () => {
    const doc = buildPlainTextDocument("Line one\nLine two\n\nNext paragraph");
    const text = extractPlainTextFromDocument(doc);
    // Single newlines become hard breaks, double newlines become paragraph breaks
    expect(text).toBe("Line one\nLine two\n\nNext paragraph");
  });
});

