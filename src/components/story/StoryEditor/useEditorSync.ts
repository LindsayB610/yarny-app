import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

import { extractPlainTextFromDocument } from "../../../editor/textExtraction";
import type { Content, NormalizedPayload, Note, Snippet } from "../../../store/types";

type UpsertEntitiesFn = (payload: NormalizedPayload) => void;

export function useEditorSync(
  editor: Editor | null,
  activeContent: Content | undefined,
  upsertEntities: UpsertEntitiesFn
) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const isSettingContentRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (!activeContent) {
        return;
      }
      if (isSettingContentRef.current) {
        return;
      }

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce store updates (300ms)
      debounceTimerRef.current = setTimeout(() => {
        if (!editor || !activeContent || isSettingContentRef.current) {
          return;
        }

        const plainText = extractPlainTextFromDocument(editor.getJSON());
        if (plainText === activeContent.content) {
          return;
        }

        const isSnippet = "chapterId" in activeContent;
        const isNote = "kind" in activeContent;

        if (isSnippet) {
          upsertEntities({
            snippets: [
              {
                ...(activeContent as Snippet),
                content: plainText,
                updatedAt: new Date().toISOString()
              }
            ]
          });
        } else if (isNote) {
          upsertEntities({
            notes: [
              {
                ...(activeContent as Note),
                content: plainText,
                updatedAt: new Date().toISOString()
              }
            ]
          });
        }
      }, 300);
    };

    const handleFocus = () => setIsEditorOpen(true);
    const handleBlur = () => {
      setTimeout(() => setIsEditorOpen(false), 5000);
    };

    editor.on("update", handleUpdate);
    editor.on("focus", handleFocus);
    editor.on("blur", handleBlur);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("focus", handleFocus);
      editor.off("blur", handleBlur);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [editor, activeContent, upsertEntities]);

  return { isEditorOpen, isSettingContentRef };
}

