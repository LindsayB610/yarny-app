import type { EditorOptions } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { useEditor } from "@tiptap/react";

export const plainTextExtensions = [
  Document,
  Paragraph,
  Text,
  HardBreak.configure({
    keepMarks: false,
    keepAttributes: false
  }),
  History.configure({
    depth: 200
  })
];

export const createPlainTextEditorOptions = (
  overrides?: Partial<EditorOptions>
): Partial<EditorOptions> => ({
  extensions: plainTextExtensions,
  editorProps: {
    attributes: {
      class:
        "plain-text-editor",
      spellcheck: "true"
    }
  },
  autofocus: false,
  editable: true,
  ...overrides
});

export const usePlainTextEditor = (options?: Partial<EditorOptions>) =>
  useEditor({
    ...createPlainTextEditorOptions(options),
    extensions: plainTextExtensions
  });

