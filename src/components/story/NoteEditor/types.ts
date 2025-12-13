export type SavePayload = {
  storyId: string;
  noteId: string;
  noteType: "characters" | "worldbuilding";
  content: string;
};

export type SaveResult = {
  content: string;
  modifiedTime: string;
};

