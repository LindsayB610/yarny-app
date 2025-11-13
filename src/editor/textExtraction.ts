import type { JSONContent } from "@tiptap/core";

export const normalizePlainText = (value: string): string =>
  value.replace(/\r\n/g, "\n").replace(/\u00A0/g, " ").trimEnd();

export const buildPlainTextDocument = (text: string): JSONContent => {
  const normalized = normalizePlainText(text);
  
  // Split by single newlines to preserve line breaks exactly as they are
  // Each line becomes a paragraph, matching legacy behavior
  const lines = normalized.split("\n");

  // Ensure at least one paragraph exists (TipTap requires at least one)
  if (lines.length === 0) {
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: []
        }
      ]
    };
  }

  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: line.length > 0
        ? [
            {
              type: "text",
              text: line
            }
          ]
        : []
    }))
  };
};

export const extractPlainTextFromDocument = (
  doc: JSONContent | null | undefined
): string => {
  if (!doc || doc.type !== "doc" || !doc.content) {
    return "";
  }

  const lines: string[] = [];

  doc.content.forEach((node) => {
    if (node.type === "paragraph") {
      // Extract text from paragraph, handling hard breaks within it
      const paragraphText: string[] = [];

      node.content?.forEach((child) => {
        if (child.type === "text" && typeof child.text === "string") {
          if (paragraphText.length === 0) {
            paragraphText.push(child.text);
          } else {
            paragraphText[paragraphText.length - 1] += child.text;
          }
        } else if (child.type === "hardBreak") {
          paragraphText.push("");
        }
      });

      // Join paragraph content (handles hard breaks within paragraph)
      const paragraphContent = paragraphText.length > 0 ? paragraphText.join("\n") : "";
      lines.push(paragraphContent);
    }
  });

  // Join all paragraphs with single newlines (each paragraph is a line)
  return lines.join("\n");
};

export const toGoogleDocsPlainText = (text: string): string =>
  normalizePlainText(text);

export const fromGoogleDocsPlainText = (text: string): JSONContent =>
  buildPlainTextDocument(text);

