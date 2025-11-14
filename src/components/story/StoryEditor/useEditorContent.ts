import { useEffect, useState } from "react";

import type { Snippet } from "../../../store/types";

export function useEditorContent(activeSnippet: Snippet | undefined) {
  const [editorContent, setEditorContent] = useState(activeSnippet?.content ?? "");

  useEffect(() => {
    setEditorContent(activeSnippet?.content ?? "");
  }, [activeSnippet?.id, activeSnippet?.content]);

  return [editorContent, setEditorContent] as const;
}

