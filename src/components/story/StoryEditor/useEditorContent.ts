import { useEffect, useState } from "react";

import type { useYarnyStore } from "../../../store/provider";
import type { selectActiveSnippet } from "../../../store/selectors";

export function useEditorContent(activeSnippet: ReturnType<typeof useYarnyStore<typeof selectActiveSnippet>>) {
  const [editorContent, setEditorContent] = useState(activeSnippet?.content ?? "");

  useEffect(() => {
    setEditorContent(activeSnippet?.content ?? "");
  }, [activeSnippet?.id, activeSnippet?.content]);

  return [editorContent, setEditorContent] as const;
}

