import { Box, Container, Typography } from "@mui/material";
import { useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";

import { DriveAuthPrompt } from "./DriveAuthPrompt";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import { NewStoryModal } from "./NewStoryModal";
import { StoriesHeader } from "./StoriesHeader";
import { VirtualizedStoryList } from "./VirtualizedStoryList";
import { useAuth } from "../../hooks/useAuth";
import { useStoriesQuery } from "../../hooks/useStoriesQuery";
import { useRefreshStories } from "../../hooks/useStoryMutations";

export function StoriesPage(): JSX.Element {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: stories, isLoading, error } = useStoriesQuery();
  const refreshStories = useRefreshStories();
  const [isNewStoryModalOpen, setIsNewStoryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter stories based on search query
  const filteredStories =
    stories?.filter((story) =>
      story.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  // Check if Drive is authorized (for now, assume authorized if we can fetch stories)
  // TODO: Add proper Drive auth check
  const isDriveAuthorized = !error && (stories !== undefined || isLoading);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleRefresh = async () => {
    await refreshStories.mutateAsync();
  };

  if (!user) {
    navigate("/login");
    return <></>;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, hsla(160, 84%, 39%, 1) 0%, hsla(180, 94%, 31%, 1) 100%)",
        pb: 4
      }}
    >
      <Container maxWidth="lg" sx={{ pt: 6, pb: 4 }}>
        <StoriesHeader
          onLogout={handleLogout}
          onNewStory={() => setIsNewStoryModalOpen(true)}
          onRefresh={handleRefresh}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
        />

        <Box
          sx={{
            mt: 4,
            bgcolor: "rgba(31, 41, 55, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: 3,
            p: 4,
            boxShadow: 6
          }}
        >
          {!isDriveAuthorized ? (
            <DriveAuthPrompt />
          ) : isLoading ? (
            <LoadingState />
          ) : filteredStories.length === 0 && searchQuery ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                No stories found matching "{searchQuery}"
              </Typography>
            </Box>
          ) : filteredStories.length === 0 ? (
            <EmptyState onNewStory={() => setIsNewStoryModalOpen(true)} />
          ) : (
            <VirtualizedStoryList
              stories={filteredStories.map((story) => ({
                ...story,
                searchQuery
              }))}
            />
          )}
        </Box>
      </Container>

      <NewStoryModal
        open={isNewStoryModalOpen}
        onClose={() => setIsNewStoryModalOpen(false)}
      />
    </Box>
  );
}

