import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import BackupIcon from "@mui/icons-material/Backup";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import EditNoteIcon from "@mui/icons-material/EditNote";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import MenuIcon from "@mui/icons-material/Menu";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import {
  Alert,
  AppBar,
  Box,
  Button,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListSubheader,
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
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { useUptimeStatus } from "../../hooks/useUptimeStatus";

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
  children: React.ReactNode;
}): JSX.Element {
  const theme = useTheme();
  return (
    <Paper
      id={id}
      elevation={8}
      sx={{
        backgroundColor: "rgba(255, 255, 255, 0.96)",
        backgroundImage:
          "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)",
        color: theme.palette.text.primary,
        borderRadius: 4,
        border: "1px solid rgba(148, 163, 184, 0.22)",
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
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
  const theme = useTheme();

  return (
    <List
      dense
      sx={{
        color: theme.palette.text.secondary,
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
              color: theme.palette.primary.main
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

// Map URL category slugs to section group labels
const CATEGORY_TO_GROUP: Record<string, string> = {
  "getting-started": "Overview",
  "writing": "Writing Workflow",
  "goals": "Goals & Metrics",
  "operations": "Operations & Sync",
  "support": "Support & Resources"
};

export function DocsPage(): JSX.Element {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useAuth();
  const uptimeStatus = useUptimeStatus();
  const { category } = useParams<{ category?: string }>();

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
                    sx={{ color: "primary.main" }}
                  >
                    lb@lindsaybrunner.com
                  </Typography>{" "}
                  from the Google address you plan to use.
                </Typography>,
                "Sign in with Google from the Yarny login screen. We request the minimal Drive scope so Yarny can only see the files it creates.",
                "After signing in for the first time, Yarny creates a \"Yarny Stories\" folder in Drive with subfolders for chapters, characters, and worldbuilding."
              ]}
            />
            <Typography variant="body1">
              Once you land on the Stories dashboard you can refresh your Drive
              catalog, create a new project, or jump straight into the editor.
            </Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2" component="div">
                <strong>Local Projects:</strong> Yarny also supports local-first projects that edit files directly on your computer. 
                Click "Import Local" on the Stories dashboard to import an existing novel project. See the{" "}
                <RouterLink to="/docs/getting-started#local-projects" style={{ color: "inherit", textDecoration: "underline" }}>
                  Local Projects
                </RouterLink>{" "}
                section for details.
              </Typography>
            </Alert>
          </Stack>
        )
      },
      {
        id: "local-projects",
        title: "Local Projects",
        icon: <LibraryBooksIcon fontSize="small" />,
        body: (
          <Stack spacing={3}>
            <Typography variant="body1">
              Yarny supports local-first projects that edit files directly on your computer. 
              This is perfect for writers who want to use Yarny's editor while keeping their files in a local repository 
              (like Git) or editing with other tools like Cursor.
            </Typography>
            <Typography variant="h6">Project Structure</Typography>
            <Typography variant="body1">
              Local projects should follow this structure:
            </Typography>
            <Box component="pre" sx={{ bgcolor: "rgba(0,0,0,0.05)", p: 2, borderRadius: 1, overflow: "auto", fontSize: "0.875rem" }}>
{`your-novel/
├── README.md              # Optional: First # heading becomes story title
├── .yarnyignore          # Optional: Files/folders to ignore
├── yarny-project.json    # Auto-generated: Project metadata
├── yarny-story.json      # Auto-generated: Story metadata
└── drafts/
    ├── chapter-1/
    │   ├── 01-opening.md
    │   ├── 02-discovery.md
    │   └── 03-conflict.md
    ├── chapter-2/
    │   ├── 01-new-day.md
    │   └── 02-investigation.md
    └── chapter-3/
        └── ...`}
            </Box>
            <BulletList
              items={[
                "Chapters are folders named `chapter-1`, `chapter-2`, etc. (sorted numerically)",
                "Snippets are markdown files (`.md`) with numbered prefixes for ordering (e.g., `01-opening.md`, `02-discovery.md`)",
                "The `README.md` file is optional—if present, the first `# Heading` becomes the story title",
                "The `.yarnyignore` file (optional) lets you exclude files/folders from import (supports glob patterns like `*.txt`, `notes/`, etc.)",
                "Yarny automatically creates `yarny-project.json` and `yarny-story.json` metadata files in the project root"
              ]}
            />
            <Typography variant="h6">Importing a Local Project</Typography>
            <BulletList
              items={[
                "Click 'Import Local' on the Stories dashboard",
                "Select your project folder (the one containing `drafts/`)",
                "Yarny will scan the structure and import all chapters and snippets",
                "The project will appear in your stories list and persist across page refreshes"
              ]}
            />
            <Typography variant="h6">Editing Local Projects</Typography>
            <BulletList
              items={[
                "Local projects work just like Drive projects—edit snippets, create chapters, manage notes",
                "Changes are saved directly to the markdown files on your computer",
                "You can edit files in Cursor or any other editor—Yarny will reload them on refresh",
                "Local projects don't require Google Drive authentication",
                "In the editor, local projects display a 'Local' badge and use 'Save to Local Files' button (instead of 'Save to Drive')",
                "On the Stories dashboard, local projects are marked with a 'Local' badge for easy identification",
                "Chapter colors are saved to `yarny-story.json` metadata and persist across sessions"
              ]}
            />
            <Typography variant="h6">.yarnyignore Patterns</Typography>
            <Typography variant="body1">
              Create a `.yarnyignore` file in your project root to exclude files from import:
            </Typography>
            <Box component="pre" sx={{ bgcolor: "rgba(0,0,0,0.05)", p: 2, borderRadius: 1, overflow: "auto", fontSize: "0.875rem" }}>
{`# Ignore specific file types
*.txt
*.docx

# Ignore entire directories
notes/
worldbuilding/
characters/
images/

# Ignore patterns
backup-*
*.tmp`}
            </Box>
            <Typography variant="body2" sx={{ fontStyle: "italic", mt: 1 }}>
              Patterns work like `.gitignore`—use `*` for wildcards, `**` for recursive matching, and `#` for comments.
            </Typography>
            <Typography variant="h6">Setting Up with Cursor (or AI Assistants)</Typography>
            <Typography variant="body1">
              If you're using Cursor or another AI assistant to organize your project, use this prompt:
            </Typography>
            <Box 
              component="pre" 
              sx={{ 
                bgcolor: "rgba(0,0,0,0.05)", 
                p: 2, 
                borderRadius: 1, 
                overflow: "auto", 
                fontSize: "0.875rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              }}
            >
{`I need to organize my novel project to work with Yarny, a writing tool that imports local markdown files.

Please organize my novel project with the following structure:

1. Create a \`drafts/\` folder in the project root
2. Organize chapters as folders named \`chapter-1\`, \`chapter-2\`, \`chapter-3\`, etc. inside \`drafts/\`
3. For each chapter, create markdown files with numbered prefixes like \`01-opening.md\`, \`02-discovery.md\`, etc.
4. Create a \`README.md\` file with a \`# Novel Title\` heading (use the actual title of my novel)
5. Optionally create a \`.yarnyignore\` file to exclude any folders/files that shouldn't be imported (like \`notes/\`, \`worldbuilding/\`, \`characters/\`, \`*.txt\`, etc.)

Please:
- Preserve all existing content
- Use descriptive, human-readable snippet filenames (e.g., \`01-opening.md\` not \`01.md\`)
- Number snippets sequentially within each chapter
- Keep chapter folders numbered sequentially starting from \`chapter-1\`
- If I have existing markdown files, organize them into this structure
- If I have other folders (like \`notes/\`, \`characters/\`, \`worldbuilding/\`), add them to \`.yarnyignore\` so they're not imported`}
            </Box>
            <Typography variant="h6">Tips</Typography>
            <BulletList
              items={[
                "Use descriptive snippet filenames so you can easily identify content when editing in Cursor or other editors",
                "Number snippets sequentially (01, 02, 03...) to maintain order",
                "Keep chapter folders numbered sequentially (chapter-1, chapter-2, chapter-3...)",
                "Yarny automatically creates and updates metadata files—don't edit `yarny-project.json` or `yarny-story.json` manually",
                "You can edit files in Cursor or any editor—changes will be reflected in Yarny on refresh"
              ]}
            />
            <Typography variant="h6">Troubleshooting</Typography>
            <BulletList
              items={[
                "Story doesn't appear after import: Check the browser console for errors. Make sure the `drafts/` folder exists and contains `chapter-*` folders.",
                "Files not importing: Check `.yarnyignore` patterns—they might be excluding your files.",
                "Story disappears on refresh: This shouldn't happen—Yarny persists the directory handle. If it does, re-import the project.",
                "Can't edit in Yarny: Make sure you granted read/write permissions when selecting the directory."
              ]}
            />
            <Typography variant="h6">For AI Assistants & Cursor</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Understanding Yarny's Structure:</strong> When working with Yarny projects, it's important to understand how Yarny organizes content and how it maps to the file system.
            </Typography>
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Yarny's Data Model</Typography>
            <Typography variant="body2" component="div" sx={{ mb: 2 }}>
              Yarny uses a hierarchical structure:
              <ul style={{ marginTop: "0.5rem", marginLeft: "1.5rem" }}>
                <li><strong>Project</strong> → Contains one or more Stories</li>
                <li><strong>Story</strong> → Contains Chapters, Snippets, and Notes</li>
                <li><strong>Chapter</strong> → Container for Snippets (ordered list)</li>
                <li><strong>Snippet</strong> → Individual writing segments (the actual content you write)</li>
                <li><strong>Notes</strong> → Characters and Worldbuilding reference material</li>
              </ul>
            </Typography>
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>File Structure Mapping</Typography>
            <Typography variant="body2" component="div" sx={{ mb: 2 }}>
              For <strong>local projects</strong>, the structure maps directly:
              <ul style={{ marginTop: "0.5rem", marginLeft: "1.5rem" }}>
                <li><code>drafts/chapter-1/</code> → A Chapter folder</li>
                <li><code>drafts/chapter-1/01-opening.md</code> → A Snippet file</li>
                <li><code>characters/nav.md</code> → A Character note (future support)</li>
                <li><code>worldbuilding/the-vireo-ship.md</code> → A Worldbuilding note (future support)</li>
                <li><code>yarny-story.json</code> → Story metadata (chapter order, snippet IDs, colors)</li>
                <li><code>yarny-project.json</code> → Project metadata</li>
              </ul>
            </Typography>
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>What Cursor Should Know</Typography>
            <BulletList
              items={[
                "Yarny edits markdown files directly—changes you make in Yarny are written to the `.md` files on disk",
                "Snippet filenames should be descriptive and human-readable (e.g., `01-opening.md` not `01.md`)",
                "Chapter folders must be named `chapter-1`, `chapter-2`, etc. (numeric ordering matters)",
                "Snippet files are ordered by filename—use leading zeros (01, 02, 03...) to maintain proper order",
                "Yarny strips markdown syntax when displaying content—files store plain text, not formatted markdown",
                "Don't edit `yarny-project.json` or `yarny-story.json` manually—Yarny manages these metadata files",
                "When creating new snippets, Yarny generates numbered filenames automatically based on snippet order",
                "Chapter colors are stored in `yarny-story.json` and persist across sessions",
                "For notes (characters/worldbuilding), use the existing `characters/` and `worldbuilding/` folders in the project root (future: Yarny will support these)"
              ]}
            />
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Best Practices for AI Assistants</Typography>
            <BulletList
              items={[
                "When organizing a project for Yarny, preserve existing content and structure as much as possible",
                "Use `.yarnyignore` to exclude folders that shouldn't be imported (like `notes/`, `plot/`, `images/`)",
                "If reorganizing snippets, maintain the numbered prefix system to preserve order",
                "When suggesting content changes, work with the plain text format—don't add markdown formatting",
                "Respect the chapter-snippet hierarchy—snippets belong to chapters, which belong to stories",
                "For Drive projects: Yarny stores content in hidden JSON files (`.{snippetId}.yarny.json`) and syncs to Google Docs in the background",
                "For local projects: Content is in plain markdown files that you can edit directly in any editor"
              ]}
            />
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
              right rail tracks your characters and worldbuilding notes.
            </Typography>
            <BulletList
              items={[
                "Create chapters with the button at the bottom of the story rail. Yarny auto-assigns an accent color that you can change at any time.",
                "Add snippets within a chapter or right from the canvas header. New snippets appear immediately—the Drive file is created in the background.",
                "Drag and drop chapters or snippets to reorder. Moves persist to Google Drive so collaborators see the updated structure.",
                "Collapse chapters to reduce visual noise. Yarny remembers what you collapsed per story.",
                "Switch between snippets without losing work. Autosave runs after short pauses, on tab switches, when the window hides, and before you close the tab.",
                "Fast, reliable saves: Yarny saves your writing to JSON files first (completing in under 50ms), then syncs to Google Docs in the background. You'll see a sync status indicator in the editor footer showing when changes are synced to Google Docs."
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
        title: "Characters & Worldbuilding",
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
              characters, worldbuilding, assets, and metadata files like <code>goal.json</code>.
              Snippet content is stored in hidden JSON files (<code>.{"{snippetId}"}.yarny.json</code>) for fast saves,
              then synced to Google Docs in the background for compatibility and collaboration.
            </Typography>
            <BulletList
              items={[
                "Look for the “Yarny Stories” folder in Drive. Inside you will find one folder per story plus combined exports you generate.",
                "Yarny only requests the drive.file scope. That means it can see files it created or files explicitly shared back with the app.",
                "Snippet content is saved to JSON files first (fast, reliable), then synced to Google Docs automatically. You can see sync status in the editor footer.",
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
                'Queued saves are listed in the offline banner. Click "Retry now" as soon as you are back online or Yarny will retry automatically.',
                "Use the Sync Story button in the editor header to manually trigger a sync of all pending changes to Google Docs.",
                "The sync status indicator in the editor footer shows when your changes have been synced to Google Docs."
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
                "Give Characters and Worldbuilding notes descriptive titles so you can jump directly from search results.",
                "Set a realistic daily goal and celebrate streaks. Elastic mode is forgiving when life happens.",
                "Run a quick export when you finish a milestone to create a Drive snapshot or Markdown backup."
              ]}
            />
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
                    sx={{ color: "primary.main" }}
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

  const sectionMap = useMemo(
    () =>
      sections.reduce<Record<string, SectionDefinition>>((acc, section) => {
        acc[section.id] = section;
        return acc;
      }, {}),
    [sections]
  );

  const sectionGroups = useMemo(
    () => [
      {
        id: "getting-started",
        label: "Overview",
        sectionIds: ["getting-started", "stories-dashboard", "local-projects"]
      },
      {
        id: "writing",
        label: "Writing Workflow",
        sectionIds: ["genres", "writing-editor", "people-places-things"]
      },
      {
        id: "goals",
        label: "Goals & Metrics",
        sectionIds: ["word-count-goals"]
      },
      {
        id: "operations",
        label: "Operations & Sync",
        sectionIds: ["exporting-backups", "drive-integration", "offline-sync"]
      },
      {
        id: "support",
        label: "Support & Resources",
        sectionIds: ["troubleshooting", "tips", "support"]
      }
    ],
    []
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

  const drawerContent = (
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
                        handleSectionNav(event, section.id);
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
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backdropFilter: "blur(14px)",
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          color: theme.palette.text.primary,
          borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
          width: "100%",
          ml: 0,
          borderRadius: 0,
          zIndex: (theme) => theme.zIndex.drawer + 1
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
              <Box
                component={RouterLink}
                to={user ? "/stories" : "/login"}
                sx={{
                  display: "inline-block",
                  textDecoration: "none",
                  flexShrink: 0,
                  "&:hover": {
                    opacity: 0.9
                  }
                }}
              >
                <Box
                  component="img"
                  src="/yarny-wordmark.svg"
                  alt="Yarny"
                  sx={{
                    height: "3rem"
                  }}
                />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                User Guide
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1.5}>
            {user ? (
              <>
                <Button
                  component={RouterLink}
                  to="/stories"
                  color="primary"
                  variant="contained"
                  startIcon={<AutoStoriesIcon />}
                  sx={{ borderRadius: "9999px", textTransform: "none", fontWeight: 600 }}
                >
                  Back to Stories
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
                borderRadius: 0,
                position: "fixed",
                top: 0,
                height: "100vh"
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
          <Stack spacing={{ xs: 4, md: 6 }} sx={{ mt: { md: -12 } }}>
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
              mt: { xs: -2, md: 0 },
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

          {!category ? (
            // Overview page - show getting started guide
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
                    Here's how a typical writing session works in Yarny:
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
                          bgcolor: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          cursor: "pointer",
                          textDecoration: "none",
                          transition: "all 0.2s",
                          "&:hover": {
                            bgcolor: "rgba(255, 255, 255, 0.1)",
                            borderColor: "rgba(255, 255, 255, 0.2)",
                            transform: "translateX(4px)"
                          }
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: "white" }}>
                          {group.label}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
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
          ) : (
            // Category page - show filtered sections with breadcrumb
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
                  {sectionGroups.find(g => g.id === category)?.label || category}
                </Typography>
              </Box>
              {visibleSections.map((section) => (
                <SectionPaper key={section.id} id={section.id} title={section.title}>
                  {section.body}
                </SectionPaper>
              ))}
            </>
          )}
        </Stack>
        </Box>
      </Box>
      </Box>

      {/* Footer matching legacy docs footer - spans full page width including sidebar */}
      <Box
        component="footer"
        sx={{
        position: { md: "fixed" },
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(148, 163, 184, 0.2)",
        py: { xs: 1.5, md: 2 },
        px: { xs: 3, md: 3 },
        mt: { xs: 6, md: 0 },
        zIndex: (theme) => theme.zIndex.drawer + 1
      }}
    >
      <Box
        sx={{
          maxWidth: 960,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.75,
          textAlign: "center"
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: "rgba(226, 232, 240, 0.78)",
            fontSize: "0.8125rem",
            fontWeight: 500,
            m: 0,
            lineHeight: 1.4
          }}
        >
          © {new Date().getFullYear()} Yarny. Your personal writing tool.
        </Typography>
        <Stack
          direction="row"
          spacing={{ xs: 2, md: 3 }}
          flexWrap="wrap"
          justifyContent="center"
          component="nav"
          aria-label="Footer navigation"
        >
          {user && (
          <Link
            component={RouterLink}
            to="/stories"
            sx={{
              color: "rgba(34, 211, 238, 0.9)",
              textDecoration: "none",
              fontSize: "0.8125rem",
              fontWeight: 600,
              transition: "color 0.2s ease",
              "&:hover": {
                color: "rgba(165, 243, 252, 0.95)"
              }
            }}
          >
            My Stories
          </Link>
          )}
          <Link
            component={RouterLink}
            to="/docs"
            sx={{
              color: "rgba(34, 211, 238, 0.9)",
              textDecoration: "none",
              fontSize: "0.8125rem",
              fontWeight: 600,
              transition: "color 0.2s ease",
              "&:hover": {
                color: "rgba(165, 243, 252, 0.95)"
              }
            }}
          >
            User Guide
          </Link>
          <Link
            component="a"
            href="/migration-plan"
            sx={{
              color: "rgba(34, 211, 238, 0.9)",
              textDecoration: "none",
              fontSize: "0.8125rem",
              fontWeight: 600,
              transition: "color 0.2s ease",
              "&:hover": {
                color: "rgba(165, 243, 252, 0.95)"
              }
            }}
          >
            Migration Plan
          </Link>
          {!user && (
            <Link
              component={RouterLink}
              to="/login"
              sx={{
                color: "rgba(34, 211, 238, 0.9)",
                textDecoration: "none",
                fontSize: "0.8125rem",
                fontWeight: 600,
                transition: "color 0.2s ease",
                "&:hover": {
                  color: "rgba(165, 243, 252, 0.95)"
                }
              }}
            >
              Back to Login
            </Link>
          )}
        </Stack>
      </Box>
      </Box>
    </Fragment>
  );
}


