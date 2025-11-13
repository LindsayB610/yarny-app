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

    // With new behavior: each line becomes a separate paragraph
    expect(doc).toMatchObject({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Line one" }]
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Line two" }]
        },
        {
          type: "paragraph",
          content: [] // empty paragraph from double newline
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
    expect(text).toBe("First paragraph\n\nSecond paragraph");
  });
});

