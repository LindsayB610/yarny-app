import type { JSONContent } from "@tiptap/core";

export const normalizePlainText = (value: string): string =>
  value.replace(/\r\n/g, "\n").replace(/\u00A0/g, " ").trimEnd();

export const buildPlainTextDocument = (text: string): JSONContent => {
  const normalized = normalizePlainText(text);
  const paragraphs = normalized.split(/\n{2,}/);

  return {
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: paragraph.length
        ? paragraph.split("\n").flatMap((line, index, array) => {
            const nodes: JSONContent[] = [
              {
                type: "text",
                text: line
              }
            ];

            if (index < array.length - 1) {
              nodes.push({
                type: "hardBreak"
              });
            }

            return nodes;
          })
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
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      lines.push(currentParagraph.join("\n"));
      currentParagraph = [];
    }
  };

  doc.content.forEach((node) => {
    if (node.type === "paragraph") {
      const paragraphLines: string[] = [];

      node.content?.forEach((child) => {
        if (child.type === "text" && typeof child.text === "string") {
          if (!paragraphLines.length) {
            paragraphLines.push(child.text);
          } else {
            paragraphLines[paragraphLines.length - 1] += child.text;
          }
        } else if (child.type === "hardBreak") {
          paragraphLines.push("");
        }
      });

      currentParagraph.push(paragraphLines.join(""));
      flushParagraph();
    }
  });

  flushParagraph();

  return lines.join("\n\n").trim();
};

export const toGoogleDocsPlainText = (text: string): string =>
  normalizePlainText(text);

export const fromGoogleDocsPlainText = (text: string): JSONContent =>
  buildPlainTextDocument(text);

