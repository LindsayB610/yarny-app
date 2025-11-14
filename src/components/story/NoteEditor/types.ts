export type SavePayload = {
  storyId: string;
  noteId: string;
  noteType: "people" | "places" | "things";
  content: string;
};

export type SaveResult = {
  content: string;
  modifiedTime: string;
};

