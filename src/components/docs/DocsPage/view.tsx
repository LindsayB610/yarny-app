import { Alert, Box, CssBaseline, Drawer, Stack, Toolbar, Typography, useMediaQuery, useTheme } from "@mui/material";
import type { JSX, MouseEvent } from "react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { DocsContent } from "./DocsContent";
import { DocsFooter } from "./DocsFooter";
import { DocsHeader } from "./DocsHeader";
import { DocsSidebar } from "./DocsSidebar";
import { createSections, createSectionGroups } from "./sections";
import { DRAWER_WIDTH } from "./types";
import type { SectionDefinition } from "./types";

export function DocsPageView(): JSX.Element {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { category } = useParams<{ category?: string }>();

  const sections: SectionDefinition[] = useMemo(() => createSections(), []);
  const sectionGroups = useMemo(() => createSectionGroups(), []);

  const sectionMap = useMemo(
    () =>
      sections.reduce<Record<string, SectionDefinition>>((acc, section) => {
        acc[section.id] = section;
        return acc;
      }, {}),
    [sections]
  );

  // Determine which sections to show based on category
  const visibleSections = useMemo(() => {
    if (!category) {
      // No category = show overview (all categories as links)
      return [];
    }
    
    const group = sectionGroups.find(g => g.id === category);
    if (!group) {
      // Invalid category, show all
      return sections;
    }
    
    // Show only sections in this category
    return sections.filter(s => group.sectionIds.includes(s.id));
  }, [category, sections, sectionGroups]);

  const handleSectionNav = useCallback(
    (event: MouseEvent<HTMLDivElement> | MouseEvent<HTMLAnchorElement>, id: string) => {
      event.preventDefault();
      // Small delay to ensure DOM is updated if we navigated to a new category
      setTimeout(() => {
        const node = document.getElementById(id);
        if (node) {
          node.scrollIntoView({
            block: "start",
            behavior: "smooth"
          });
        }
      }, 100);
      if (!isMdUp) {
        setMobileNavOpen(false);
      }
    },
    [isMdUp]
  );

  // Handle hash scrolling on mount/route change
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      setTimeout(() => {
        const node = document.getElementById(id);
        if (node) {
          node.scrollIntoView({
            block: "start",
            behavior: "smooth"
          });
        }
      }, 300);
    }
  }, [category]);

  return (
    <Fragment>
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, hsla(160, 84%, 39%, 1) 0%, hsla(180, 94%, 31%, 1) 100%)"
        }}
      >
        <CssBaseline />
        <DocsHeader onMenuClick={() => setMobileNavOpen(true)} />

        <Box
          component="nav"
          sx={{
            width: { md: DRAWER_WIDTH },
            flexShrink: { md: 0 },
            position: { md: "fixed" },
            top: { md: 0 },
            left: 0,
            height: { md: "100vh" },
            zIndex: (theme) => theme.zIndex.drawer
          }}
          aria-label="Documentation sections"
        >
          {!isMdUp ? (
            <Drawer
              variant="temporary"
              open={mobileNavOpen}
              onClose={() => setMobileNavOpen(false)}
              ModalProps={{
                keepMounted: true
              }}
              sx={{
                display: { xs: "block", md: "none" },
                "& .MuiDrawer-paper": {
                  width: DRAWER_WIDTH,
                  border: "none",
                  borderRadius: 0
                }
              }}
            >
              <DocsSidebar
                category={category}
                sectionGroups={sectionGroups}
                sectionMap={sectionMap}
                onSectionNav={handleSectionNav}
              />
            </Drawer>
          ) : (
            <Drawer
              variant="permanent"
              open
              sx={{
                display: { xs: "none", md: "block" },
                "& .MuiDrawer-paper": {
                  width: DRAWER_WIDTH,
                  border: "none",
                  borderRadius: 0,
                  position: "fixed",
                  top: 0,
                  height: "100vh"
                }
              }}
            >
              <DocsSidebar
                category={category}
                sectionGroups={sectionGroups}
                sectionMap={sectionMap}
                onSectionNav={handleSectionNav}
              />
            </Drawer>
          )}
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            ml: { md: `${DRAWER_WIDTH}px` },
            height: { md: `calc(100vh - 88px)` },
            overflowY: "auto",
            position: { md: "fixed" },
            top: { md: 88 },
            right: 0,
            pb: { md: 12 } // Add padding bottom for footer
          }}
        >
          <Box
            sx={{
              pt: { xs: 2, md: 2 },
              px: { xs: 3, md: 6 },
              pb: { xs: 3, md: 6 }
            }}
          >
            <Toolbar sx={{ minHeight: 88 }} />
            <Stack spacing={{ xs: 4, md: 6 }}>
              <Alert
                severity="warning"
                variant="filled"
                sx={{
                  backgroundColor: "rgba(17, 24, 39, 0.88)",
                  color: "#FFFFFF",
                  fontWeight: 500,
                  fontSize: "1rem",
                  lineHeight: 1.625,
                  borderRadius: 3,
                  boxShadow:
                    "0 20px 25px -5px rgba(0, 0, 0, 0.36), 0 10px 10px -5px rgba(0, 0, 0, 0.26)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  borderLeft: "4px solid #F59E0B",
                  backdropFilter: "blur(14px)",
                  py: 5,
                  px: 5,
                  maxWidth: "1000px",
                  mx: "auto",
                  mt: { xs: -3, md: -4 },
                  "& .MuiAlert-icon": {
                    color: "#F59E0B",
                    fontSize: "1.5rem",
                    alignItems: "flex-start",
                    mt: 0.5
                  },
                  "& .MuiAlert-message": {
                    width: "100%",
                    fontWeight: 500,
                    color: "rgba(255, 255, 255, 0.88)"
                  }
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    color: "rgba(255, 255, 255, 0.9)",
                    fontWeight: 500,
                    fontSize: "1rem",
                    lineHeight: 1.625,
                    display: "block"
                  }}
                >
                  Yarny is currently in alpha. Features may change and we are actively
                  incorporating writer feedback. Report anything unexpected so we can tighten the
                  experience quickly.
                </Typography>
              </Alert>

              <DocsContent
                category={category}
                sectionGroups={sectionGroups}
                visibleSections={visibleSections}
              />
            </Stack>
          </Box>
        </Box>
      </Box>

      <DocsFooter />
    </Fragment>
  );
}

