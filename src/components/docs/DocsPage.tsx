import MenuIcon from "@mui/icons-material/Menu";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import EditNoteIcon from "@mui/icons-material/EditNote";
import BackupIcon from "@mui/icons-material/Backup";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import {
  Alert,
  AppBar,
  Box,
  Button,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import type { JSX, MouseEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";

const DRAWER_WIDTH = 288;

const GENRE_DESCRIPTIONS = [
  {
    name: "Literary Fiction",
    description:
      "Character-driven, stylistically ambitious work focused on theme, voice, and human psychology."
  },
  {
    name: "Science Fiction",
    description:
      "Explores scientific or technological “what-ifs,” from spacefaring futures to AI ethics and alternate realities."
  },
  {
    name: "Fantasy",
    description:
      "Worlds shaped by magic, myth, or the supernatural; includes subgenres like epic, urban, and dark fantasy."
  },
  {
    name: "Mystery",
    description:
      "Built around solving a puzzle, crime, or secret through logic, intuition, or investigation."
  },
  {
    name: "Thriller",
    description:
      "High-stakes, tightly paced stories driven by danger, pursuit, or conspiracy."
  },
  {
    name: "Horror",
    description:
      "Designed to evoke fear or dread through the monstrous, uncanny, or psychologically disturbing."
  },
  {
    name: "Romance",
    description:
      "Centers on love and emotional intimacy, usually culminating in hope or resolution."
  },
  {
    name: "Historical Fiction",
    description:
      "Imagined narratives set in authentic past eras, blending research and storytelling."
  },
  {
    name: "Adventure",
    description:
      "Focused on exploration, physical challenge, and daring exploits in vivid settings."
  },
  {
    name: "Western",
    description:
      "Set against the American frontier or similar landscapes of lawlessness and moral testing."
  },
  {
    name: "Crime / Noir",
    description:
      "Examines morality, justice, and corruption through the lens of criminals or investigators."
  },
  {
    name: "Comedy / Satire",
    description:
      "Uses humor, irony, or exaggeration to critique human behavior or society."
  },
  {
    name: "Magical Realism",
    description:
      "The ordinary world laced with subtle, unexplained magic treated as mundane."
  },
  {
    name: "Dystopian / Post-apocalyptic",
    description:
      "Portrays societies after collapse or under oppressive control, often as cautionary allegory."
  },
  {
    name: "Gothic",
    description:
      "Brooding atmosphere, decaying settings, and emotional excess; where horror meets romance and ruin."
  },
  {
    name: "Family Saga / Domestic Fiction",
    description:
      "Multi-generational or household dramas exploring love, duty, and identity."
  },
  {
    name: "Political / War Fiction",
    description:
      "Stories centered on ideology, espionage, and moral conflict in times of unrest."
  },
  {
    name: "Paranormal / Supernatural",
    description:
      "Ghosts, hauntings, psychic phenomena, and spiritual intrusion on daily life."
  },
  {
    name: "Young Adult (YA)",
    description:
      "Coming-of-age tales foregrounding adolescent identity and discovery, across any setting or tone."
  },
  {
    name: "Speculative / Slipstream",
    description:
      "Genre-bending fiction that mixes realism with the surreal or metaphysical; fiction that feels slightly out of phase with the real world."
  }
] as const;

type SectionDefinition = {
  id: string;
  title: string;
  icon: JSX.Element;
  body: JSX.Element;
};

function SectionPaper({
  id,
  title,
  children
}: {
  id: string;
  title: string;
  children: JSX.Element;
}): JSX.Element {
  const theme = useTheme();
  return (
    <Paper
      id={id}
      elevation={8}
      sx={{
        background:
          theme.palette.mode === "dark"
            ? "rgba(15, 23, 42, 0.9)"
            : "linear-gradient(135deg, rgba(17, 24, 39, 0.92) 0%, rgba(30, 41, 59, 0.9) 100%)",
        color: "rgba(241, 245, 249, 0.95)",
        borderRadius: 4,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        boxShadow: "0 25px 60px rgba(15, 23, 42, 0.45)",
        p: { xs: 3, md: 4 },
        mb: { xs: 4, md: 6 },
        scrollMarginTop: { xs: 96, md: 120 }
      }}
    >
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: 700,
          color: "primary.main"
        }}
      >
        {title}
      </Typography>
      <Divider
        sx={{
          borderColor: "rgba(148, 163, 184, 0.3)",
          mb: 3
        }}
      />
      {children}
    </Paper>
  );
}

function BulletList({
  items
}: {
  items: Array<string | JSX.Element>;
}): JSX.Element {
  return (
    <List
      dense
      sx={{
        color: "rgba(226, 232, 240, 0.9)",
        "& .MuiListItemButton-root": {
          borderRadius: 2
        }
      }}
    >
      {items.map((item, index) => (
        <ListItemButton
          key={index}
          disableGutters
          sx={{
            alignItems: "flex-start",
            py: 1,
            px: 0
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 32,
              mt: "4px",
              color: "primary.light"
            }}
          >
            <CheckCircleOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{
              variant: "body1",
              sx: { color: "inherit" }
            }}
            primary={item}
          />
        </ListItemButton>
      ))}
    </List>
  );
}

export function DocsPage(): JSX.Element {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useAuth();

  const sections: SectionDefinition[] = useMemo(
    () => [
      {
        id: "getting-started",
        title: "Getting Started",
        icon: <NavigateNextIcon fontSize="small" />,
        body: (
          <Stack spacing={3}>
            <Typography variant="body1">
              Yarny is a focused writing environment that stores every story, snippet,
              and note in your Google Drive account. Account access is invitation-only
              while the React experience is in active development.
            </Typography>
            <BulletList
              items={[
                <Typography key="invite" component="span" variant="body1">
                  <strong>Request access:</strong> Email{" "}
                  <Typography
                    component="a"
                    href="mailto:lb@lindsaybrunner.com"
                    sx={{ color: "primary.light" }}
                  >
                    lb@lindsaybrunner.com
                  </Typography>{" "}
                  from the Google address you plan to use.
                </Typography>,
                "Sign in with Google from the Yarny login screen. We request the minimal Drive scope so Yarny can only see the files it creates.",
                "After signing in for the first time, Yarny creates a \"Yarny Stories\" folder in Drive with subfolders for chapters, people, places, and things."
              ]}
            />
            <Typography variant="body1">
              Once you land on the Stories dashboard you can refresh your Drive
              catalog, create a new project, or jump straight into the editor.
            </Typography>
          </Stack>
        )
      },
      {
        id: "stories-dashboard",
        title: "Managing Stories",
        icon: <AutoStoriesIcon fontSize="small" />,
        body: (
          <Stack spacing={3}>
            <Typography variant="body1">
              The Stories dashboard provides a searchable grid of every project in your
              Drive workspace. Behind the scenes we virtualize the list for large
              libraries, so scrolling stays responsive even with hundreds of stories.
            </Typography>
            <BulletList
              items={[
                <Typography key="create" component="span" variant="body1">
                  <strong>Create a story:</strong> Click <em>New Story</em>, supply a name,
                  optional genre and description, set a word-count target, and (optionally)
                  preconfigure a writing goal with deadline, writing days, and days off.
                </Typography>,
                "Search instantly filters both story titles and Drive metadata.",
                "Story cards surface last modified timestamps, total goal progress, and—when a daily goal is active—the ‘Today’ badge with current word count and days remaining.",
                "Use the refresh icon to pull changes made directly inside Google Drive."
              ]}
            />
            <Typography variant="body1">
              Selecting a card stores the active story in local storage so Yarny can reopen
              the editor exactly where you left off.
            </Typography>
          </Stack>
        )
      },
      {
        id: "genres",
        title: "Story Genres",
        icon: <LibraryBooksIcon fontSize="small" />,
        body: (
          <Stack spacing={3}>
            <Typography variant="body1">
              The New Story modal includes a genre dropdown so you can tag each project with
              a quick shorthand. Use this reference when collaborating or deciding which
              label best matches your draft.
            </Typography>
            <BulletList
              items={GENRE_DESCRIPTIONS.map((genre) => (
                <Typography key={genre.name} component="span" variant="body1">
                  <strong>{genre.name}</strong> — {genre.description}
                </Typography>
              ))}
            />
          </Stack>
        )
      },
      {
        id: "writing-editor",
        title: "Writing in the Editor",
        icon: <EditNoteIcon fontSize="small" />,
        body: (
          <Stack spacing={3}>
            <Typography variant="body1">
              Yarny separates structure from drafting so you can focus on the words:
              chapters live in the left rail, the canvas holds the active snippet, and the
              right rail tracks your people, places, and things.
            </Typography>
            <BulletList
              items={[
                "Create chapters with the button at the bottom of the story rail. Yarny auto-assigns an accent color that you can change at any time.",
                "Add snippets within a chapter or right from the canvas header. New snippets appear immediately—the Drive file is created in the background.",
                "Drag and drop chapters or snippets to reorder. Moves persist to Google Drive so collaborators see the updated structure.",
                "Collapse chapters to reduce visual noise. Yarny remembers what you collapsed per story.",
                "Switch between snippets without losing work. Autosave runs after short pauses, on tab switches, when the window hides, and before you close the tab."
              ]}
            />
            <Typography variant="body1">
              If Yarny detects Drive edits that conflict with your local work, a Resolve
              Changes dialog lets you preview and choose whether to keep the Drive version
              or push your local text back to Drive.
            </Typography>
          </Stack>
        )
      },
      {
        id: "people-places-things",
        title: "People, Places, and Things",
        icon: <EditNoteIcon fontSize="small" />,
        body: (
          <Stack spacing={3}>
            <Typography variant="body1">
              Use the notes sidebar to capture reference material without leaving the editor.
              Each tab writes to its own Drive folder and syncs independently from chapter
              snippets.
            </Typography>
            <BulletList
              items={[
                "Create a note from the tab toolbar. Yarny focuses the note in the canvas for continuous editing.",
                "Reorder with drag and drop or keyboard navigation. Changes sync immediately.",
                "Daily goals ignore note word counts so you can brainstorm freely without affecting chapter progress."
              ]}
            />
          </Stack>
        )
      },
      {
        id: "word-count-goals",
        title: "Word Count & Goals",
        icon: <NavigateNextIcon fontSize="small" />,
        body: (
          <Stack spacing={3}>
            <Typography variant="body1">
              Goals keep track of both the big picture and the day-to-day commitments.
              Everything is optional—you can write without goals or turn them on for any
              story when you are ready.
            </Typography>
            <BulletList
              items={[
                "The story sidebar shows a goal meter with total words versus your project target.",
                "Click the meter or the Today chip to edit goal settings: target, deadline, days of the week you write, days off, and strict vs. elastic mode.",
                "Elastic mode recalculates your daily quota based on progress. Strict mode keeps the same quota and surfaces whether you are ahead or behind.",
                "The Stories dashboard repeats the Today badge so you can see progress without opening the editor."
              ]}
            />
          </Stack>
        )
      },
      {
        id: "exporting-backups",
        title: "Exporting & Backups",
        icon: <BackupIcon fontSize="small" />,
        body: (
          <Stack spacing={3}>
            <Typography variant="body1">
              When you are ready to share or archive your work, Yarny can compile snippets
              into a single document or mirror everything to a local folder.
            </Typography>
            <BulletList
              items={[
                "Use the Export button in the footer to create a combined Google Doc of all chapter snippets. Yarny handles large stories by chunking the upload.",
                "If local backups are enabled, you can export chapters to Markdown directly on your machine.",
                <Typography key="local-backups" component="span" variant="body1">
                  <strong>Local backups:</strong> Visit <RouterLink to="/settings/storage">Settings → Storage</RouterLink> to pick a folder, enable mirroring, open the folder, or trigger a full refresh.
                </Typography>
              ]}
            />
            <Typography variant="body1">
              Local mirroring works offline and is great for automated testing or creating a
              personal archive. Drive remains your source of truth—exports never modify your
              original snippets.
            </Typography>
          </Stack>
        )
      },
      {
        id: "drive-integration",
        title: "Google Drive Integration",
        icon: <BackupIcon fontSize="small" />,
        body: (
          <Stack spacing={3}>
            <Typography variant="body1">
              Each Yarny story is represented as a Drive folder with subfolders for chapters,
              people, places, things, assets, and metadata files like <code>goal.json</code>.
            </Typography>
            <BulletList
              items={[
                "Look for the “Yarny Stories” folder in Drive. Inside you will find one folder per story plus combined exports you generate.",
                "Yarny only requests the drive.file scope. That means it can see files it created or files explicitly shared back with the app.",
                "If you edit a snippet directly in Google Docs and leave unresolved comments or suggestions, Yarny will warn you before overwriting them from the editor."
              ]}
            />
            <Typography variant="body1">
              If you need to collaborate in Google Docs, resolve comments there and reload in
              Yarny to resume editing safely.
            </Typography>
          </Stack>
        )
      },
      {
        id: "offline-sync",
        title: "Offline & Sync Health",
        icon: <CloudOffIcon fontSize="small" />,
        body: (
          <Stack spacing={3}>
            <Typography variant="body1">
              Yarny automatically handles intermittent connectivity. The banner at the top of
              the editor keeps you informed when something needs attention.
            </Typography>
            <BulletList
              items={[
                "If you go offline, Yarny queues saves locally and syncs them once you reconnect.",
                "Queued saves are listed in the offline banner. Click “Retry now” as soon as you are back online or Yarny will retry automatically.",
                "Manual Save is always available in the editor header for a quick confidence check."
              ]}
            />
          </Stack>
        )
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        icon: <HelpOutlineIcon fontSize="small" />,
        body: (
          <Stack spacing={3}>
            <Typography variant="body1">
              Most issues resolve by refreshing Drive data or checking authentication. Use the
              checklist below before reaching out.
            </Typography>
            <BulletList
              items={[
                "Confirm you are signed in with the invited Google account. If needed, sign out from the Stories header and sign back in.",
                "If stories are missing, click Refresh on the Stories dashboard to sync Drive.",
                "Check browser console errors (Option ⌥/Alt + Cmd ⌘ + J in Chrome). Include screenshots or error messages when you email support."
              ]}
            />
            <Typography variant="body1">
              Still stuck? Send an email with the steps you followed, the story you were
              working on, and any error details so we can help quickly.
            </Typography>
          </Stack>
        )
      },
      {
        id: "tips",
        title: "Tips & Best Practices",
        icon: <TipsAndUpdatesIcon fontSize="small" />,
        body: (
          <Stack spacing={3}>
            <BulletList
              items={[
                "Use chapter colors to group POVs, timelines, or revisions at a glance.",
                "Create short snippets—they are easier to rearrange and help autosave stay lightning fast.",
                "Give People/Places/Things notes descriptive titles so you can jump directly from search results.",
                "Set a realistic daily goal and celebrate streaks. Elastic mode is forgiving when life happens.",
                "Run a quick export when you finish a milestone to create a Drive snapshot or Markdown backup."
              ]}
            />
          </Stack>
        )
      },
      {
        id: "testing-workbook",
        title: "Testing Workbook",
        icon: <AssignmentTurnedInIcon fontSize="small" />,
        body: (
          <Stack spacing={3}>
            <Typography variant="body1">
              Our migration from the legacy app to the React experience is tracked through a
              series of structured testing workbooks. Each phase documents goals, scenarios,
              and validation steps. Reference these when planning manual QA passes or
              onboarding new contributors to test coverage.
            </Typography>
            <BulletList
              items={[
                <Typography key="overview" component="span" variant="body1">
                  <strong>Workbook Overview:</strong>{" "}
                  <Typography
                    component="a"
                    href="/migration-plan/testing-workbook.html"
                    sx={{ color: "primary.light" }}
                  >
                    testing-workbook.html
                  </Typography>{" "}
                  — complete index of test artifacts.
                </Typography>,
                <Typography key="phase-1" component="span" variant="body1">
                  <strong>Phase 1 – Foundations & Access:</strong>{" "}
                  <Typography
                    component="a"
                    href="/migration-plan/testing-workbook-phase-1.html"
                    sx={{ color: "primary.light" }}
                  >
                    phase-1 workbook
                  </Typography>
                </Typography>,
                <Typography key="phase-2" component="span" variant="body1">
                  <strong>Phase 2 – Auth & Stories:</strong>{" "}
                  <Typography
                    component="a"
                    href="/migration-plan/testing-workbook-phase-2.html"
                    sx={{ color: "primary.light" }}
                  >
                    phase-2 workbook
                  </Typography>
                </Typography>,
                <Typography key="phase-3" component="span" variant="body1">
                  <strong>Phase 3 – Editor Experience:</strong>{" "}
                  <Typography
                    component="a"
                    href="/migration-plan/testing-workbook-phase-3.html"
                    sx={{ color: "primary.light" }}
                  >
                    phase-3 workbook
                  </Typography>
                </Typography>,
                <Typography key="phase-4" component="span" variant="body1">
                  <strong>Phase 4 – Tri-pane & Notes:</strong>{" "}
                  <Typography
                    component="a"
                    href="/migration-plan/testing-workbook-phase-4.html"
                    sx={{ color: "primary.light" }}
                  >
                    phase-4 workbook
                  </Typography>
                </Typography>,
                <Typography key="phase-5" component="span" variant="body1">
                  <strong>Phase 5 – Exports & Library Features:</strong>{" "}
                  <Typography
                    component="a"
                    href="/migration-plan/testing-workbook-phase-5.html"
                    sx={{ color: "primary.light" }}
                  >
                    phase-5 workbook
                  </Typography>
                </Typography>
              ]}
            />
            <Typography variant="body1">
              Each workbook includes pass/fail tracking and links back to the broader
              migration plan. Use them as checklists during regression cycles or to audit how
              the React app aligns with the original Yarny behavior.
            </Typography>
          </Stack>
        )
      },
      {
        id: "support",
        title: "Support & Feedback",
        icon: <SupportAgentIcon fontSize="small" />,
        body: (
          <Stack spacing={3}>
            <Typography variant="body1">
              Yarny is in active development. Feedback from writers is how we prioritize
              polish, accessibility, and advanced workflows.
            </Typography>
            <BulletList
              items={[
                <Typography key="contact" component="span" variant="body1">
                  Email{" "}
                  <Typography
                    component="a"
                    href="mailto:lb@lindsaybrunner.com"
                    sx={{ color: "primary.light" }}
                  >
                    lb@lindsaybrunner.com
                  </Typography>{" "}
                  with questions, bug reports, or ideas.
                </Typography>,
                "Attach Drive export links or screenshots if you are reporting formatting issues.",
                "Let us know if you would like to join future beta testing rounds."
              ]}
            />
          </Stack>
        )
      }
    ],
    []
  );

  const handleSectionNav = useCallback(
    (event: MouseEvent<HTMLDivElement> | MouseEvent<HTMLAnchorElement>, id: string) => {
      event.preventDefault();
      const node = document.getElementById(id);
      if (node) {
        node.scrollIntoView({
          block: "start",
          behavior: "smooth"
        });
      }
      if (!isMdUp) {
        setMobileNavOpen(false);
      }
    },
    [isMdUp]
  );

  const drawerContent = (
    <Box
      role="navigation"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 118, 110, 0.85) 100%)",
        color: "rgba(226, 232, 240, 0.92)"
      }}
    >
      <Toolbar sx={{ minHeight: 88 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Yarny Guide
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.25)" }} />
      <List
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 1
        }}
      >
        {sections.map((section) => (
          <ListItemButton
            key={section.id}
            onClick={(event) => handleSectionNav(event, section.id)}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              color: "inherit",
              "&:hover": {
                bgcolor: "rgba(148, 163, 184, 0.12)"
              }
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 32,
                color: "primary.light"
              }}
            >
              {section.icon}
            </ListItemIcon>
            <ListItemText primary={section.title} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.25)" }} />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ color: "rgba(226, 232, 240, 0.75)" }}>
          Need more help? Email{" "}
          <Typography
            component="a"
            href="mailto:lb@lindsaybrunner.com"
            sx={{ color: "primary.light" }}
          >
            lb@lindsaybrunner.com
          </Typography>
          .
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        background: "linear-gradient(180deg, hsla(160, 84%, 39%, 1) 0%, hsla(180, 94%, 31%, 1) 100%)"
      }}
    >
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backdropFilter: "blur(14px)",
          background: "rgba(15, 23, 42, 0.85)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` }
        }}
      >
        <Toolbar sx={{ minHeight: 88, display: "flex", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {!isMdUp && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation menu"
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Yarny User Guide
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            {user ? (
              <>
                <Button
                  component={RouterLink}
                  to="/stories"
                  color="inherit"
                  variant="outlined"
                  sx={{ borderRadius: "9999px", textTransform: "none" }}
                >
                  My Stories
                </Button>
                <Button
                  component={RouterLink}
                  to="/settings/storage"
                  color="inherit"
                  variant="outlined"
                  sx={{ borderRadius: "9999px", textTransform: "none" }}
                >
                  Storage Settings
                </Button>
              </>
            ) : (
              <Button
                component={RouterLink}
                to="/login"
                color="inherit"
                variant="outlined"
                sx={{ borderRadius: "9999px", textTransform: "none" }}
              >
                Back to Sign In
              </Button>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
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
                border: "none"
              }
            }}
          >
            {drawerContent}
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
                position: "relative"
              }
            }}
          >
            {drawerContent}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 3, md: 6 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }
        }}
      >
        <Toolbar sx={{ minHeight: 88 }} />
        <Stack spacing={{ xs: 4, md: 6 }}>
          <Alert
            severity="warning"
            variant="outlined"
            sx={{
              backgroundColor: "rgba(254, 243, 199, 0.12)",
              borderColor: "rgba(251, 191, 36, 0.45)",
              color: "rgba(180, 83, 9, 0.95)",
              "& .MuiAlert-icon": {
                color: "rgba(217, 119, 6, 1)"
              }
            }}
          >
            Yarny React is currently in alpha. Features may change and we are actively
            incorporating writer feedback. Report anything unexpected so we can tighten the
            experience quickly.
          </Alert>

          <SectionPaper id="getting-started" title="Getting Started">
            {sections.find((section) => section.id === "getting-started")?.body ?? null}
          </SectionPaper>

          <SectionPaper id="stories-dashboard" title="Managing Stories">
            {sections.find((section) => section.id === "stories-dashboard")?.body ?? null}
          </SectionPaper>

          <SectionPaper id="genres" title="Story Genres">
            {sections.find((section) => section.id === "genres")?.body ?? null}
          </SectionPaper>

          <SectionPaper id="writing-editor" title="Writing in the Editor">
            {sections.find((section) => section.id === "writing-editor")?.body ?? null}
          </SectionPaper>

          <SectionPaper id="people-places-things" title="People, Places, and Things">
            {sections.find((section) => section.id === "people-places-things")?.body ?? null}
          </SectionPaper>

          <SectionPaper id="word-count-goals" title="Word Count & Goals">
            {sections.find((section) => section.id === "word-count-goals")?.body ?? null}
          </SectionPaper>

          <SectionPaper id="exporting-backups" title="Exporting & Backups">
            {sections.find((section) => section.id === "exporting-backups")?.body ?? null}
          </SectionPaper>

          <SectionPaper id="drive-integration" title="Google Drive Integration">
            {sections.find((section) => section.id === "drive-integration")?.body ?? null}
          </SectionPaper>

          <SectionPaper id="offline-sync" title="Offline & Sync Health">
            {sections.find((section) => section.id === "offline-sync")?.body ?? null}
          </SectionPaper>

          <SectionPaper id="troubleshooting" title="Troubleshooting">
            {sections.find((section) => section.id === "troubleshooting")?.body ?? null}
          </SectionPaper>

          <SectionPaper id="tips" title="Tips & Best Practices">
            {sections.find((section) => section.id === "tips")?.body ?? null}
          </SectionPaper>

          <SectionPaper id="testing-workbook" title="Testing Workbook">
            {sections.find((section) => section.id === "testing-workbook")?.body ?? null}
          </SectionPaper>

          <SectionPaper id="support" title="Support & Feedback">
            {sections.find((section) => section.id === "support")?.body ?? null}
          </SectionPaper>
        </Stack>
      </Box>
    </Box>
  );
}


