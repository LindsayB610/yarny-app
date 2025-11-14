import type { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";

import { buildPlainTextDocument, extractPlainTextFromDocument } from "../../../editor/textExtraction";
import type { useYarnyStore } from "../../../store/provider";
import type { selectActiveSnippet } from "../../../store/selectors";

export function useEditorContentSync(
  editor: Editor | null,
  activeSnippet: ReturnType<typeof useYarnyStore<typeof selectActiveSnippet>>,
  activeSnippetId: string | undefined,
  isEditorOpen: boolean,
  hasUnsavedChanges: boolean,
  isSettingContentRef: React.MutableRefObject<boolean>
) {
  const lastLoadedSnippetIdRef = useRef<string | undefined>(activeSnippet?.id);
  const lastAppliedContentRef = useRef<string>("");

  useEffect(() => {
    if (!editor) return;

    const snippetChanged = activeSnippetId !== lastLoadedSnippetIdRef.current;
    const contentChanged = activeSnippet?.content !== lastAppliedContentRef.current;

    if (!snippetChanged && (!contentChanged || isEditorOpen || hasUnsavedChanges)) {
      return;
    }

    if (!editor.isEditable) {
      editor.setEditable(true);
    }

    const newContent = activeSnippet?.content ?? "";
    const currentEditorContent = extractPlainTextFromDocument(editor.getJSON());
    
    if (currentEditorContent !== newContent) {
      isSettingContentRef.current = true;
      const newDocument = buildPlainTextDocument(newContent);
      editor.commands.setContent(newDocument, false, {
        preserveWhitespace: true
      });
      
      setTimeout(() => {
        isSettingContentRef.current = false;
      }, 0);
    }

    lastAppliedContentRef.current = newContent;
    lastLoadedSnippetIdRef.current = activeSnippetId;

    requestAnimationFrame(() => {
      if (activeSnippetId && editor.isEditable) {
        const tryFocus = () => {
          if (editor.isDestroyed) return;
          editor.commands.focus("end");
          if (!editor.isFocused && (!activeSnippet?.content || activeSnippet.content.trim() === "")) {
            setTimeout(() => {
              if (!editor.isDestroyed && editor.isEditable) {
                editor.commands.focus("end");
              }
            }, 50);
          }
        };
        tryFocus();
      }
    });
  }, [editor, activeSnippetId, activeSnippet?.content, isEditorOpen, hasUnsavedChanges, isSettingContentRef]);
}

