import type { JSONContent } from "@tiptap/core";

export const normalizePlainText = (value: string): string =>
  value.replace(/\r\n/g, "\n").replace(/\u00A0/g, " ").trimEnd();

/**
 * Converts markdown to plain text by stripping markdown syntax
 * This allows markdown files to display as clean text in the editor
 * Examples:
 * - "**bold**" -> "bold"
 * - "*italic*" -> "italic"
 * - "# Header" -> "Header"
 * - "[link](url)" -> "link"
 * - "`code`" -> "code"
 */
export const markdownToPlainText = (markdown: string): string => {
  let text = markdown;

  // Remove code blocks (```code``` or ```language\ncode\n```)
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    // Extract code content, removing language identifier if present
    const codeContent = match.replace(/^```\w*\n?/m, "").replace(/\n?```$/m, "");
    return codeContent;
  });

  // Remove inline code (`code`)
  text = text.replace(/`([^`]+)`/g, "$1");

  // Remove headers (### Header -> Header)
  text = text.replace(/^#{1,6}\s+(.+)$/gm, "$1");

  // Remove bold (**bold** or __bold__)
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");

  // Remove italic (*italic* or _italic_)
  // Be careful not to match bold - only match single asterisks/underscores
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1");
  text = text.replace(/(?<!_)_([^_]+)_(?!_)/g, "$1");

  // Remove links ([text](url) or [text][ref])
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\[[^\]]+\]/g, "$1");

  // Remove images (![alt](url))
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // Remove strikethrough (~~text~~)
  text = text.replace(/~~([^~]+)~~/g, "$1");

  // Remove horizontal rules (--- or ***)
  text = text.replace(/^[-*]{3,}$/gm, "");

  // Remove blockquotes (> text)
  text = text.replace(/^>\s+(.+)$/gm, "$1");

  // Remove list markers (- item, * item, 1. item)
  text = text.replace(/^[\s]*[-*+]\s+(.+)$/gm, "$1");
  text = text.replace(/^[\s]*\d+\.\s+(.+)$/gm, "$1");
  
  // Trim leading whitespace from lines (after removing markers)
  text = text.split("\n").map(line => line.trimStart()).join("\n");

  return normalizePlainText(text);
};

export const buildPlainTextDocument = (text: string): JSONContent => {
  const normalized = normalizePlainText(text);
  
  // Collapse multiple consecutive newlines to maximum of 2 (paragraph break)
  // This prevents excessive spacing from markdown files
  const collapsed = normalized.replace(/\n{3,}/g, "\n\n");
  
  // Split by double newlines (paragraph breaks) first
  const paragraphs = collapsed.split(/\n\n/);

  // Ensure at least one paragraph exists (TipTap requires at least one)
  if (paragraphs.length === 0 || (paragraphs.length === 1 && paragraphs[0] === "")) {
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
    content: paragraphs.map((para) => {
      // Within each paragraph, single newlines become hard breaks
      const lines = para.split("\n");
      
      const paragraphContent: Array<{ type: "text" | "hardBreak"; text?: string }> = [];
      
      lines.forEach((line, index) => {
        if (line.length > 0) {
          paragraphContent.push({
            type: "text",
            text: line
          });
        }
        // Add hard break after each line except the last
        if (index < lines.length - 1) {
          paragraphContent.push({
            type: "hardBreak"
          });
        }
      });
      
      return {
        type: "paragraph",
        content: paragraphContent.length > 0 ? paragraphContent : []
      };
    })
  };
};

export const extractPlainTextFromDocument = (
  doc: JSONContent | null | undefined
): string => {
  if (!doc || doc.type !== "doc" || !doc.content) {
    return "";
  }

  const paragraphs: string[] = [];

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
      paragraphs.push(paragraphContent);
    }
  });

  // Join paragraphs with double newlines (paragraph breaks)
  return paragraphs.join("\n\n");
};

export const toGoogleDocsPlainText = (text: string): string =>
  normalizePlainText(text);

export const fromGoogleDocsPlainText = (text: string): JSONContent =>
  buildPlainTextDocument(text);

