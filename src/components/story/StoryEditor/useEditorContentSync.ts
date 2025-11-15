import type { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";

import { buildPlainTextDocument, extractPlainTextFromDocument } from "../../../editor/textExtraction";
import type { Content, Note, Snippet } from "../../../store/types";

export function useEditorContentSync(
  editor: Editor | null,
  activeSnippet: Snippet | undefined,
  activeContent: Content | undefined,
  activeContentId: string | undefined,
  isEditorOpen: boolean,
  hasUnsavedChanges: boolean,
  isSettingContentRef: React.MutableRefObject<boolean>
) {
  const lastLoadedContentIdRef = useRef<string | undefined>(activeContent?.id);
  const lastAppliedContentRef = useRef<string>("");

  useEffect(() => {
    if (!editor) return;

    const contentIdChanged = activeContentId !== lastLoadedContentIdRef.current;
    const contentChanged = activeContent?.content !== lastAppliedContentRef.current;

    if (!contentIdChanged && (!contentChanged || isEditorOpen || hasUnsavedChanges)) {
      return;
    }

    if (!editor.isEditable) {
      editor.setEditable(true);
    }

    // Use activeContent.content if available (works for both snippets and notes)
    // Fallback to activeSnippet.content for backward compatibility
    const newContent = activeContent?.content ?? activeSnippet?.content ?? "";
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
    lastLoadedContentIdRef.current = activeContentId;

    requestAnimationFrame(() => {
      if (activeContentId && editor.isEditable) {
        const tryFocus = () => {
          if (editor.isDestroyed) return;
          editor.commands.focus("end");
          const contentToCheck = activeContent?.content ?? activeSnippet?.content ?? "";
          if (!editor.isFocused && (!contentToCheck || contentToCheck.trim() === "")) {
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
  }, [editor, activeContentId, activeContent?.content, activeSnippet?.content, isEditorOpen, hasUnsavedChanges, isSettingContentRef]);
}

