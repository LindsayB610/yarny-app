import { Search, Close } from "@mui/icons-material";
import {
  Box,
  Dialog,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
  Divider
} from "@mui/material";
import { useState, useEffect, useRef, useMemo, type JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { GlobalSearchModalProps, SearchResultGroup } from "./types";
import { useGlobalSearch } from "./useGlobalSearch";

import { highlightSearchText } from "@/utils/highlightSearch";

const RESULT_TYPE_LABELS: Record<SearchResultGroup["type"], string> = {
  chapter: "Chapters",
  snippet: "Snippets",
  character: "Characters",
  worldbuilding: "Worldbuilding",
  editor: "Current Document"
};

export function GlobalSearchModalView({ open, onClose }: GlobalSearchModalProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { storyId } = useParams<{ storyId?: string }>();
  const results = useGlobalSearch(searchTerm);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm("");
      // Small delay to ensure input is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: SearchResultGroup[] = [];
    const typeMap = new Map<SearchResultGroup["type"], SearchResultGroup["type"][]>();

    results.forEach((result) => {
      if (!typeMap.has(result.type)) {
        typeMap.set(result.type, []);
        groups.push({
          type: result.type,
          label: RESULT_TYPE_LABELS[result.type],
          results: []
        });
      }
    });

    results.forEach((result) => {
      const group = groups.find((g) => g.type === result.type);
      if (group) {
        group.results.push(result);
      }
    });

    return groups.filter((group) => group.results.length > 0);
  }, [results]);

  const handleResultClick = (result: typeof results[0]) => {
    if (!storyId) return;

    if (result.type === "chapter") {
      // Navigate to first snippet in chapter, or just the story
      void navigate(`/stories/${storyId}`);
    } else if (result.type === "snippet") {
      void navigate(`/stories/${storyId}/snippets/${result.id}`);
    } else if (result.type === "character") {
      void navigate(`/stories/${storyId}/characters/${result.id}`);
    } else if (result.type === "worldbuilding") {
      void navigate(`/stories/${storyId}/worldbuilding/${result.id}`);
    } else if (result.type === "editor") {
      // Already viewing this, just close the modal
    }

    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "rgba(31, 41, 55, 0.95)",
          backdropFilter: "blur(10px)",
          color: "white",
          maxHeight: "80vh"
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <Box sx={{ p: 2, pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <TextField
          inputRef={searchInputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search chapters, snippets, notes..."
          size="medium"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: "rgba(255, 255, 255, 0.7)" }} />
              </InputAdornment>
            )
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              color: "white",
              "& fieldset": {
                borderColor: "rgba(255, 255, 255, 0.3)"
              },
              "&:hover fieldset": {
                borderColor: "rgba(255, 255, 255, 0.5)"
              },
              "&.Mui-focused fieldset": {
                borderColor: "rgba(255, 255, 255, 0.7)"
              }
            }
          }}
        />
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: "rgba(255, 255, 255, 0.7)" }}
        >
          <Close />
        </IconButton>
      </Box>

      <Box sx={{ maxHeight: "60vh", overflow: "auto", px: 2, pb: 2 }}>
        {searchTerm.trim() && groupedResults.length === 0 && (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
              No results found
            </Typography>
          </Box>
        )}

        {!searchTerm.trim() && (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
              Start typing to search across your story
            </Typography>
          </Box>
        )}

        {groupedResults.map((group, groupIndex) => (
          <Box key={group.type}>
            {groupIndex > 0 && <Divider sx={{ my: 1, borderColor: "rgba(255, 255, 255, 0.1)" }} />}
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                textTransform: "uppercase",
                fontWeight: 600,
                px: 1,
                py: 0.5,
                display: "block"
              }}
            >
              {group.label}
            </Typography>
            <List dense disablePadding>
              {group.results.map((result) => {
                const highlightedTitle = highlightSearchText(result.title, searchTerm);
                const highlightedPreview = result.preview
                  ? highlightSearchText(result.preview, searchTerm)
                  : null;

                return (
                  <ListItem key={result.id} disablePadding>
                    <ListItemButton
                      onClick={() => handleResultClick(result)}
                      sx={{
                        borderRadius: 1,
                        "&:hover": {
                          bgcolor: "rgba(255, 255, 255, 0.1)"
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box
                            component="span"
                            sx={{
                              display: "block",
                              fontWeight: 500,
                              mb: result.preview ? 0.5 : 0
                            }}
                          >
                            {highlightedTitle.map((part, i) => (
                              <Box
                                key={i}
                                component="span"
                                sx={{
                                  bgcolor: part.highlight
                                    ? "rgba(255, 255, 0, 0.3)"
                                    : "transparent"
                                }}
                              >
                                {part.text}
                              </Box>
                            ))}
                            {result.chapterTitle && (
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{
                                  ml: 1,
                                  color: "rgba(255, 255, 255, 0.5)",
                                  fontWeight: 400
                                }}
                              >
                                in {result.chapterTitle}
                              </Typography>
                            )}
                          </Box>
                        }
                        secondary={
                          highlightedPreview && (
                            <Typography
                              variant="body2"
                              sx={{
                                color: "rgba(255, 255, 255, 0.6)",
                                fontSize: "0.75rem",
                                lineHeight: 1.4,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden"
                              }}
                            >
                              {highlightedPreview.map((part, i) => (
                                <Box
                                  key={i}
                                  component="span"
                                  sx={{
                                    bgcolor: part.highlight
                                      ? "rgba(255, 255, 0, 0.3)"
                                      : "transparent"
                                  }}
                                >
                                  {part.text}
                                </Box>
                              ))}
                            </Typography>
                          )
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
    </Dialog>
  );
}

