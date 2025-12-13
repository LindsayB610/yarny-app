import { Box, Paper } from "@mui/material";
import { EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { useRef, type JSX } from "react";

interface EditorContentAreaProps {
  editor: Editor | null;
}

export function EditorContentArea({ editor }: EditorContentAreaProps): JSX.Element {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!editor) {
    return <></>;
  }

  return (
    <Paper
      sx={{
        flex: 1,
        // top rounded corners
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        backgroundColor: "#fff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxShadow: "0 2px 6px rgba(15, 23, 42, 0.4)"
      }}
      onClick={() => {
        if (editor && !editor.isDestroyed && editor.isEditable && !editor.isFocused) {
          editor.commands.focus("start");
        }
      }}
    >
      <Box
        ref={scrollContainerRef}
        sx={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          pt: { xs: 3, md: 6 },
          pb: { xs: 3, md: 6 },
          "& .plain-text-editor": {
            maxWidth: "100%",
            width: "100%"
          }
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "800px", // Constrain editor width for readability
            px: { xs: 2, md: 4 }
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Box>
    </Paper>
  );
}

