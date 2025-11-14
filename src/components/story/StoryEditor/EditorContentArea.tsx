import { Box } from "@mui/material";
import { EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { JSX } from "react";

interface EditorContentAreaProps {
  editor: Editor | null;
}

export function EditorContentArea({ editor }: EditorContentAreaProps): JSX.Element {
  if (!editor) return <></>;

  return (
    <Box
      sx={{
        flex: 1,
        borderRadius: 3,
        backgroundColor: "#E9E9EB",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxShadow: "inset 0 2px 6px rgba(15, 23, 42, 0.04)"
      }}
      onClick={() => {
        if (editor && !editor.isDestroyed && editor.isEditable && !editor.isFocused) {
          editor.commands.focus("end");
        }
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          pt: { xs: 3, md: 6 },
          pb: { xs: 3, md: 6 }
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}

