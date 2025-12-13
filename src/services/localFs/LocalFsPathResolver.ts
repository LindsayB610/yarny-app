export type NoteCategory = "characters" | "worldbuilding";

const ROOT_FOLDER = "stories";
const NOTES_FOLDER = "notes";
const SNIPPETS_FOLDER = "snippets";
const METADATA_FOLDER = "metadata";
const EXPORTS_FOLDER = "exports";
const ATTACHMENTS_FOLDER = "attachments";
const INDEX_FOLDER = "index";

const ensureString = (value: string, fallback: string): string => {
  if (!value || value.trim().length === 0) {
    return fallback;
  }
  return value.trim();
};

const storyRoot = (storyId: string): string[] => [ROOT_FOLDER, ensureString(storyId, "unknown-story")];

const metadataDirectory = (storyId: string): string[] => [...storyRoot(storyId), METADATA_FOLDER];

const notesDirectory = (storyId: string): string[] => [...storyRoot(storyId), NOTES_FOLDER];
const noteCategoryDirectory = (storyId: string, category: NoteCategory): string[] => [
  ...notesDirectory(storyId),
  category
];
const noteFile = (storyId: string, category: NoteCategory, noteId: string): string[] => [
  ...noteCategoryDirectory(storyId, category),
  `${ensureString(noteId, "note")}.md`
];
const noteOrderFile = (storyId: string, category: NoteCategory): string[] => [
  ...noteCategoryDirectory(storyId, category),
  "_order.json"
];

const snippetsDirectory = (storyId: string): string[] => [...storyRoot(storyId), SNIPPETS_FOLDER];
const snippetFile = (storyId: string, snippetId: string): string[] => [
  ...snippetsDirectory(storyId),
  `${ensureString(snippetId, "snippet")}.md`
];

const attachmentsDirectory = (storyId: string): string[] => [
  ...storyRoot(storyId),
  ATTACHMENTS_FOLDER
];
const attachmentFile = (storyId: string, attachmentId: string): string[] => [
  ...attachmentsDirectory(storyId),
  `${ensureString(attachmentId, "attachment")}`
];

const indexDirectory = (): string[] => [INDEX_FOLDER];
const indexFile = (): string[] => [...indexDirectory(), "index.json"];
const exportsDirectory = (): string[] => [EXPORTS_FOLDER];
const exportFile = (fileName: string): string[] => [
  ...exportsDirectory(),
  ensureString(fileName, "export.md")
];

export const LocalFsPathResolver = {
  storyRoot,
  storyDocument(storyId: string): string[] {
    return [...storyRoot(storyId), "story.md"];
  },
  metadataDirectory,
  metadataFile(storyId: string): string[] {
    return [...metadataDirectory(storyId), "metadata.json"];
  },
  projectFile(storyId: string): string[] {
    return [...metadataDirectory(storyId), "project.json"];
  },
  dataFile(storyId: string): string[] {
    return [...metadataDirectory(storyId), "data.json"];
  },
  goalFile(storyId: string): string[] {
    return [...metadataDirectory(storyId), "goal.json"];
  },
  notesDirectory,
  noteCategoryDirectory,
  noteFile,
  noteOrderFile,
  snippetsDirectory,
  snippetFile,
  attachmentsDirectory,
  attachmentFile,
  indexDirectory,
  indexFile,
  exportsDirectory,
  exportFile
} as const;



