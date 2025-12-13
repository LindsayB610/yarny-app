import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import BackupIcon from "@mui/icons-material/Backup";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import EditNoteIcon from "@mui/icons-material/EditNote";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import { Alert, Box, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { BulletList } from "./BulletList";
import { GENRE_DESCRIPTIONS } from "./types";
import type { SectionDefinition, SectionGroup } from "./types";

export function createSections(): SectionDefinition[] {
  return [
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
              Click &quot;Import Local&quot; on the Stories dashboard to import an existing novel project. See the{" "}
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
            This is perfect for writers who want to use Yarny&apos;s editor while keeping their files in a local repository 
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
            If you&apos;re using Cursor or another AI assistant to organize your project, use this prompt:
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
            <strong>Understanding Yarny&apos;s Structure:</strong> When working with Yarny projects, it&apos;s important to understand how Yarny organizes content and how it maps to the file system.
          </Typography>
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Yarny&apos;s Data Model</Typography>
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
              "Story cards surface last modified timestamps, total goal progress, and—when a daily goal is active—the 'Today' badge with current word count and days remaining.",
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
              "Look for the \"Yarny Stories\" folder in Drive. Inside you will find one folder per story plus combined exports you generate.",
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
  ];
}

export function createSectionGroups(): SectionGroup[] {
  return [
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
  ];
}

