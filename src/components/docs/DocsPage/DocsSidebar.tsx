import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Box, Button, Divider, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Typography } from "@mui/material";
import type { JSX, MouseEvent } from "react";
import { Link as RouterLink } from "react-router-dom";

import { useUptimeStatus } from "@/hooks/useUptimeStatus";
import type { SectionDefinition, SectionGroup } from "./types";

interface DocsSidebarProps {
  category: string | undefined;
  sectionGroups: SectionGroup[];
  sectionMap: Record<string, SectionDefinition>;
  onSectionNav: (event: MouseEvent<HTMLDivElement> | MouseEvent<HTMLAnchorElement>, id: string) => void;
}

export function DocsSidebar({
  category,
  sectionGroups,
  sectionMap,
  onSectionNav
}: DocsSidebarProps): JSX.Element {
  const uptimeStatus = useUptimeStatus();

  return (
    <Box
      role="navigation"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgba(31, 41, 55, 0.98)",
        color: "rgba(255, 255, 255, 0.9)",
        pt: { md: 11 } // 88px header height (11 * 8px = 88px)
      }}
    >
      <Box sx={{ px: 2, pb: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: "0.875rem",
            fontWeight: 500
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              flexShrink: 0,
              backgroundColor:
                uptimeStatus.status === "up"
                  ? "#10B981"
                  : uptimeStatus.status === "warning"
                    ? "#F59E0B"
                    : uptimeStatus.status === "down"
                      ? "#EF4444"
                      : "#6B7280",
              boxShadow:
                uptimeStatus.status === "up"
                  ? "0 0 8px rgba(16, 185, 129, 0.5)"
                  : uptimeStatus.status === "warning"
                    ? "0 0 8px rgba(245, 158, 11, 0.5)"
                    : uptimeStatus.status === "down"
                      ? "0 0 8px rgba(239, 68, 68, 0.5)"
                      : "none",
              transition: "background-color 0.2s ease, box-shadow 0.2s ease"
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: "0.875rem",
              lineHeight: 1.4
            }}
          >
            {uptimeStatus.label}
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.25)" }} />
      {category && (
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Button
            component={RouterLink}
            to="/docs"
            startIcon={<NavigateNextIcon sx={{ transform: "rotate(180deg)" }} />}
            sx={{
              color: "rgba(255, 255, 255, 0.8)",
              textTransform: "none",
              fontSize: "0.875rem",
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.05)",
                color: "rgba(255, 255, 255, 1)"
              }
            }}
          >
            Back to Overview
          </Button>
        </Box>
      )}
      <List
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 1,
          py: 1
        }}
      >
        {sectionGroups.map((group) => {
          const isActive = category === group.id;
          return (
            <Box key={group.id || group.label} sx={{ mb: 2 }}>
              {category ? (
                <ListSubheader
                  component="div"
                  disableSticky
                  sx={{
                    lineHeight: 1.6,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    fontSize: "0.75rem",
                    bgcolor: "transparent",
                    color: isActive ? "rgba(16, 185, 129, 1)" : "rgba(148, 163, 184, 0.9)",
                    px: 2,
                    pb: 0.5
                  }}
                >
                  {group.label}
                </ListSubheader>
              ) : (
                <ListSubheader
                  component={RouterLink}
                  to={`/docs/${group.id}`}
                  disableSticky
                  sx={{
                    lineHeight: 1.6,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    fontSize: "0.75rem",
                    bgcolor: "transparent",
                    color: "rgba(148, 163, 184, 0.9)",
                    px: 2,
                    pb: 0.5,
                    cursor: "pointer",
                    textDecoration: "none",
                    "&:hover": {
                      color: "rgba(16, 185, 129, 0.8)"
                    }
                  }}
                >
                  {group.label}
                </ListSubheader>
              )}
              {(!category || isActive) && group.sectionIds.map((sectionId) => {
                const section = sectionMap[sectionId];
                if (!section) {
                  return null;
                }

                const sectionUrl = category 
                  ? `/docs/${category}#${section.id}`
                  : `/docs/${group.id}#${section.id}`;

                return (
                  <ListItemButton
                    key={section.id}
                    component={RouterLink}
                    to={sectionUrl}
                    onClick={(event) => {
                      // If we're already on the correct category page, handle scroll
                      // Otherwise, let RouterLink handle navigation first
                      if (category === group.id && window.location.hash === `#${section.id}`) {
                        event.preventDefault();
                        onSectionNav(event, section.id);
                      }
                    }}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      color: "rgba(255, 255, 255, 0.8)",
                      "&:hover": {
                        bgcolor: "rgba(255, 255, 255, 0.05)",
                        color: "rgba(255, 255, 255, 1)"
                      }
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 32,
                        color: "rgba(16, 185, 129, 1)"
                      }}
                    >
                      {section.icon}
                    </ListItemIcon>
                    <ListItemText primary={section.title} />
                  </ListItemButton>
                );
              })}
            </Box>
          );
        })}
      </List>
    </Box>
  );
}

