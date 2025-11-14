import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

import { extractPlainTextFromDocument } from "../../../editor/textExtraction";
import type { useYarnyStore } from "../../../store/provider";
import type { selectActiveSnippet } from "../../../store/selectors";

type UpsertEntitiesFn = (payload: { snippets: Array<{ id: string; content: string; updatedAt: string }> }) => void;

export function useEditorSync(
  editor: Editor | null,
  activeSnippet: ReturnType<typeof useYarnyStore<typeof selectActiveSnippet>>,
  upsertEntities: UpsertEntitiesFn
) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const isSettingContentRef = useRef(false);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (!activeSnippet) return;
      if (isSettingContentRef.current) return;

      const plainText = extractPlainTextFromDocument(editor.getJSON());
      if (plainText === activeSnippet.content) return;

      upsertEntities({
        snippets: [
          {
            ...activeSnippet,
            content: plainText,
            updatedAt: new Date().toISOString()
          }
        ]
      });
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
    };
  }, [editor, activeSnippet, upsertEntities]);

  return { isEditorOpen, isSettingContentRef };
}

