import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import type { JSX } from "react";
import { Link as RouterLink } from "react-router-dom";

import { BulletList } from "./BulletList";
import { SectionPaper } from "./SectionPaper";
import type { SectionDefinition, SectionGroup } from "./types";

interface DocsContentProps {
  category: string | undefined;
  sectionGroups: SectionGroup[];
  visibleSections: SectionDefinition[];
}

export function DocsContent({
  category,
  sectionGroups,
  visibleSections
}: DocsContentProps): JSX.Element {
  if (!category) {
    // Overview page - show getting started guide
    return (
      <>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: "white" }}>
          Getting Started with Yarny
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: "rgba(255, 255, 255, 0.9)", fontSize: "1.125rem", lineHeight: 1.7 }}>
          Yarny is a focused writing environment designed for novelists. Store your stories in Google Drive or work locally with markdown files. 
          Organize chapters, track progress, and write without distractions.
        </Typography>

        <SectionPaper id="quick-start" title="Quick Start">
          <Stack spacing={3}>
            <Typography variant="h6" sx={{ fontWeight: 600, mt: -1 }}>
              First Steps
            </Typography>
            <BulletList
              items={[
                <Typography key="access" component="span" variant="body1">
                  <strong>Get access:</strong> Yarny is invitation-only during development. Email{" "}
                  <Typography
                    component="a"
                    href="mailto:lb@lindsaybrunner.com"
                    sx={{ color: "primary.main", textDecoration: "none" }}
                  >
                    lb@lindsaybrunner.com
                  </Typography>{" "}
                  from your Google account to request access.
                </Typography>,
                "Sign in with Google from the Yarny login screen. Yarny only requests minimal Drive permissions to see files it creates.",
                "After your first sign-in, Yarny creates a \"Yarny Stories\" folder in your Google Drive with organized subfolders for your projects.",
                "On the Stories dashboard, click \"New Story\" to create your first project, or use \"Import Local\" to work with existing markdown files on your computer."
              ]}
            />
          </Stack>
        </SectionPaper>

        <SectionPaper id="key-features" title="Key Features">
          <Stack spacing={3}>
            <Typography variant="body1">
              Yarny is built around a simple, powerful structure that separates organization from writing:
            </Typography>
            <BulletList
              items={[
                <Typography key="structure" component="span" variant="body1">
                  <strong>Chapters & Snippets:</strong> Organize your novel into chapters, each containing multiple snippets. 
                  Drag and drop to reorder, create new snippets instantly, and focus on one piece at a time.
                </Typography>,
                <Typography key="notes" component="span" variant="body1">
                  <strong>Characters & Worldbuilding:</strong> Keep reference material in dedicated notes that sync independently. 
                  Access them from the sidebar without leaving your writing.
                </Typography>,
                <Typography key="goals" component="span" variant="body1">
                  <strong>Word Count Goals:</strong> Set project targets and daily writing goals with flexible scheduling. 
                  Track progress on the dashboard and in the editor.
                </Typography>,
                <Typography key="sync" component="span" variant="body1">
                  <strong>Fast, Reliable Saves:</strong> Yarny saves to JSON files first (under 50ms), then syncs to Google Docs in the background. 
                  Work offline and sync when you reconnect.
                </Typography>,
                <Typography key="local" component="span" variant="body1">
                  <strong>Local Projects:</strong> Import existing markdown projects and edit files directly on your computer. 
                  Perfect for Git workflows or using with other editors like Cursor.
                </Typography>
              ]}
            />
          </Stack>
        </SectionPaper>

        <SectionPaper id="workflow-overview" title="Your Writing Workflow">
          <Stack spacing={3}>
            <Typography variant="body1">
              Here&apos;s how a typical writing session works in Yarny:
            </Typography>
            <BulletList
              items={[
                "Start on the Stories dashboard—create a new story or open an existing one.",
                "In the editor, create chapters and add snippets. Each snippet is a focused piece of writing.",
                "Use the left sidebar to navigate between chapters and snippets. Drag to reorder as your story evolves.",
                "Add character and worldbuilding notes in the right sidebar. These stay accessible while you write.",
                "Set a word count goal to track progress. Yarny shows your daily progress and remaining days.",
                "Your work saves automatically. Changes sync to Google Drive (or save locally for local projects).",
                "Export your story when ready—create a combined Google Doc or export chapters as Markdown."
              ]}
            />
          </Stack>
        </SectionPaper>

        <SectionPaper id="choose-your-path" title="Choose Your Path">
          <Stack spacing={3}>
            <Typography variant="body1">
              Yarny supports two ways to work with your stories:
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)"
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: "primary.main" }}>
                  Google Drive Projects
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Store everything in Google Drive for cloud sync, collaboration, and automatic backups. 
                  Perfect if you want to access your stories from multiple devices or share with collaborators.
                </Typography>
                <Button
                  component={RouterLink}
                  to="/docs/getting-started#getting-started"
                  variant="outlined"
                  size="small"
                  sx={{ textTransform: "none" }}
                >
                  Learn More →
                </Button>
              </Paper>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.3)"
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: "info.main" }}>
                  Local Projects
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Work with markdown files directly on your computer. Import existing projects, use Git for version control, 
                  or edit with other tools. Changes save directly to your files.
                </Typography>
                <Button
                  component={RouterLink}
                  to="/docs/getting-started#local-projects"
                  variant="outlined"
                  size="small"
                  color="info"
                  sx={{ textTransform: "none" }}
                >
                  Learn More →
                </Button>
              </Paper>
            </Box>
          </Stack>
        </SectionPaper>

        <SectionPaper id="explore-docs" title="Explore the Documentation">
          <Stack spacing={2}>
            <Typography variant="body1">
              Ready to dive deeper? Explore these sections:
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {sectionGroups.map((group) => (
                <Paper
                  key={group.id}
                  component={RouterLink}
                  to={`/docs/${group.id}`}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: "rgba(0, 0, 0, 0.02)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    cursor: "pointer",
                    textDecoration: "none",
                    transition: "all 0.2s",
                    "&:hover": {
                      bgcolor: "rgba(0, 0, 0, 0.04)",
                      borderColor: "rgba(148, 163, 184, 0.4)",
                      transform: "translateX(4px)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                    }
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: "text.primary" }}>
                    {group.label}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {group.sectionIds.length} {group.sectionIds.length === 1 ? "section" : "sections"} covering {group.label.toLowerCase()}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </SectionPaper>

        <SectionPaper id="need-help" title="Need Help?">
          <Stack spacing={2}>
            <Typography variant="body1">
              Yarny is in active development. If you run into issues or have questions:
            </Typography>
            <BulletList
              items={[
                <Typography key="email" component="span" variant="body1">
                  Email{" "}
                  <Typography
                    component="a"
                    href="mailto:lb@lindsaybrunner.com"
                    sx={{ color: "primary.main", textDecoration: "none" }}
                  >
                    lb@lindsaybrunner.com
                  </Typography>{" "}
                  with questions, bug reports, or feature ideas.
                </Typography>,
                "Check the Troubleshooting section for common issues and solutions.",
                "Review the Tips & Best Practices section for workflow suggestions."
              ]}
            />
            <Box sx={{ mt: 2 }}>
              <Button
                component={RouterLink}
                to="/docs/support#troubleshooting"
                variant="outlined"
                sx={{ textTransform: "none", mr: 2 }}
              >
                Troubleshooting Guide
              </Button>
              <Button
                component={RouterLink}
                to="/docs/support#support"
                variant="outlined"
                sx={{ textTransform: "none" }}
              >
                Contact Support
              </Button>
            </Box>
          </Stack>
        </SectionPaper>
      </>
    );
  }

  // Category page - show filtered sections with breadcrumb
  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Button
          component={RouterLink}
          to="/docs"
          startIcon={<NavigateNextIcon sx={{ transform: "rotate(180deg)" }} />}
          sx={{
            color: "rgba(255, 255, 255, 0.8)",
            textTransform: "none",
            mb: 1,
            "&:hover": {
              bgcolor: "rgba(255, 255, 255, 0.05)"
            }
          }}
        >
          User Guide
        </Button>
        <Typography variant="h3" sx={{ fontWeight: 700, color: "white" }}>
          {sectionGroups.find(g => g.id === category)?.label ?? category}
        </Typography>
      </Box>
      {visibleSections.map((section) => (
        <SectionPaper key={section.id} id={section.id} title={section.title}>
          {section.body}
        </SectionPaper>
      ))}
    </>
  );
}

