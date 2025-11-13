import { Add, Refresh, Search } from "@mui/icons-material";
import { Box, Button, IconButton, TextField, Typography } from "@mui/material";
import type { JSX } from "react";
import { Link as RouterLink } from "react-router-dom";

interface StoriesHeaderProps {
  onLogout: () => void;
  onNewStory: () => void;
  onRefresh: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
}

export function StoriesHeader({
  onLogout,
  onNewStory,
  onRefresh,
  onSearchChange,
  searchQuery
}: StoriesHeaderProps): JSX.Element {
  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4
        }}
      >
        <Box>
          <Typography
            variant="h3"
            sx={{
              color: "white",
              fontWeight: "bold",
              mb: 1,
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
            }}
          >
            Yarny
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "1rem" }}
          >
            Your writing projects
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Button
            component={RouterLink}
            to="/docs"
            sx={{
              color: "white",
              borderColor: "rgba(255, 255, 255, 0.3)",
              "&:hover": {
                borderColor: "rgba(255, 255, 255, 0.5)",
                bgcolor: "rgba(255, 255, 255, 0.1)"
              }
            }}
            variant="outlined"
          >
            Docs
          </Button>
          <Button
            component={RouterLink}
            to="/settings/storage"
            sx={{
              color: "white",
              borderColor: "rgba(255, 255, 255, 0.3)",
              "&:hover": {
                borderColor: "rgba(255, 255, 255, 0.5)",
                bgcolor: "rgba(255, 255, 255, 0.1)"
              }
            }}
            variant="outlined"
          >
            Settings
          </Button>
          <Button
            onClick={onLogout}
            sx={{
              color: "white",
              borderColor: "rgba(255, 255, 255, 0.3)",
              "&:hover": {
                borderColor: "rgba(255, 255, 255, 0.5)",
                bgcolor: "rgba(255, 255, 255, 0.1)"
              }
            }}
            variant="outlined"
          >
            Sign out
          </Button>
        </Box>
      </Box>

      {/* Stories Content Header Bar */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          mb: 3
        }}
      >
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search stories..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <Search sx={{ color: "rgba(255, 255, 255, 0.5)", mr: 1 }} />
              )
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                "& fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.2)"
                },
                "&:hover fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.3)"
                },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main"
                }
              },
              "& .MuiInputBase-input::placeholder": {
                color: "rgba(255, 255, 255, 0.5)",
                opacity: 1
              }
            }}
          />
          <IconButton
            onClick={onRefresh}
            sx={{
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.1)",
                borderColor: "rgba(255, 255, 255, 0.3)"
              }
            }}
            title="Refresh from Drive"
          >
            <Refresh />
          </IconButton>
          <Button
            onClick={onNewStory}
            startIcon={<Add />}
            variant="contained"
            sx={{
              bgcolor: "primary.main",
              color: "white",
              "&:hover": {
                bgcolor: "primary.dark"
              },
              borderRadius: "9999px",
              textTransform: "none",
              fontWeight: "bold"
            }}
          >
            New Story
          </Button>
        </Box>
      </Box>
    </>
  );
}

