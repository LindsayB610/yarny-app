import type { Snippet } from "../../../store/types";

const PLACEHOLDER_TITLES = new Set([
  "new project",
  "untitled story",
  "new story",
  "story title",
  "project title"
]);

export function getSnippetFileName(snippet: Snippet | undefined, editorContent: string): string {
  if (!snippet) {
    return "Snippet.doc";
  }

  const lines = editorContent.split(/\r?\n/);
  const firstNonEmptyLine =
    lines.map((line) => line.trim()).find((line) => line.length > 0) ??
    `Snippet ${snippet.order + 1}`;

  const sanitized = firstNonEmptyLine.replace(/[\\/:*?"<>|]+/g, "").slice(0, 60).trim();
  const baseName =
    sanitized.length > 0 ? sanitized : `Snippet-${snippet.order + 1}`;

  return baseName.toLowerCase().endsWith(".doc") ? baseName : `${baseName}.doc`;
}

export function getDisplayTitle(
  storyTitle: string | undefined,
  metadataTitle: string | undefined
): string {
  const normalize = (value: string | undefined | null) => {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  };

  const prefer = (value: string | undefined) => {
    if (!value) {
      return undefined;
    }
    return PLACEHOLDER_TITLES.has(value.toLowerCase()) ? undefined : value;
  };

  const metadataTitleNormalized = prefer(normalize(metadataTitle));
  const storeTitleNormalized = prefer(normalize(storyTitle));
  const fallbackMetadata = normalize(metadataTitle);
  const fallbackStoreTitle = normalize(storyTitle);

  return (
    metadataTitleNormalized ??
    storeTitleNormalized ??
    fallbackMetadata ??
    fallbackStoreTitle ??
    "Untitled Story"
  );
}

