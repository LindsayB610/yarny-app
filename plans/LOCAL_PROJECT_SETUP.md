# Setting Up a Local Novel Project for Yarny

This guide explains how to organize a novel project so it works seamlessly with Yarny's local project import feature.

## Project Structure

Yarny expects a specific folder structure for local projects:

```
your-novel/
├── README.md              # Optional: First # heading becomes story title
├── .yarnyignore          # Optional: Files/folders to ignore
├── yarny-project.json    # Auto-generated: Project metadata (don't edit manually)
├── yarny-story.json      # Auto-generated: Story metadata (don't edit manually)
└── drafts/
    ├── chapter-1/
    │   ├── 01-opening.md
    │   ├── 02-discovery.md
    │   └── 03-conflict.md
    ├── chapter-2/
    │   ├── 01-new-day.md
    │   └── 02-investigation.md
    └── chapter-3/
        └── ...
```

## Key Rules

1. **Chapters**: Folders named `chapter-1`, `chapter-2`, `chapter-3`, etc. (must start with `chapter-` and be numbered)
2. **Snippets**: Markdown files (`.md`) with numbered prefixes for ordering (e.g., `01-opening.md`, `02-discovery.md`)
3. **README.md**: Optional—if present, the first `# Heading` becomes the story title in Yarny
4. **.yarnyignore**: Optional—exclude files/folders from import (supports glob patterns)

## Instructions for Cursor (or any AI assistant)

Use this prompt to organize your novel project:

```
I need to organize my novel project to work with Yarny, a writing tool that imports local markdown files. 

Please organize my novel project with the following structure:

1. Create a `drafts/` folder in the project root
2. Organize chapters as folders named `chapter-1`, `chapter-2`, `chapter-3`, etc. inside `drafts/`
3. For each chapter, create markdown files with numbered prefixes like `01-opening.md`, `02-discovery.md`, etc.
4. Create a `README.md` file with a `# Novel Title` heading (use the actual title of my novel)
5. Optionally create a `.yarnyignore` file to exclude any folders/files that shouldn't be imported (like `notes/`, `worldbuilding/`, `characters/`, `*.txt`, etc.)

The structure should be:
- your-novel/
  - README.md
  - .yarnyignore (optional)
  - drafts/
    - chapter-1/
      - 01-snippet-name.md
      - 02-another-snippet.md
    - chapter-2/
      - 01-snippet-name.md
      - ...

Please:
- Preserve all existing content
- Use descriptive, human-readable snippet filenames (e.g., `01-opening.md` not `01.md`)
- Number snippets sequentially within each chapter
- Keep chapter folders numbered sequentially starting from `chapter-1`
- If I have existing markdown files, organize them into this structure
- If I have other folders (like `notes/`, `characters/`, `worldbuilding/`), add them to `.yarnyignore` so they're not imported
```

## Example .yarnyignore

If you have additional folders that shouldn't be imported into Yarny:

```
# Ignore specific file types
*.txt
*.docx

# Ignore entire directories
notes/
worldbuilding/
characters/
images/
backups/

# Ignore patterns
backup-*
*.tmp
.DS_Store
```

## Importing into Yarny

1. Open Yarny in your browser
2. Click "Import Local" on the Stories dashboard
3. Select your project folder (the one containing `drafts/`)
4. Yarny will scan the structure and import all chapters and snippets
5. The project will appear in your stories list

## Editing Workflow

- **In Yarny**: Edit snippets using Yarny's rich text editor. Changes save directly to the markdown files.
- **In Cursor/Other Editors**: Edit the markdown files directly. Yarny will reload them on refresh.
- **Git**: Commit your changes normally—Yarny's metadata files (`yarny-project.json`, `yarny-story.json`) are safe to commit.

## Tips

- Use descriptive snippet filenames so you can easily identify content when editing in Cursor
- Number snippets sequentially (01, 02, 03...) to maintain order
- Keep chapter folders numbered sequentially (chapter-1, chapter-2, chapter-3...)
- The `.yarnyignore` file uses glob patterns similar to `.gitignore`
- Yarny automatically creates and updates the metadata files—don't edit them manually

## Troubleshooting

- **Story doesn't appear after import**: Check the browser console for errors. Make sure the `drafts/` folder exists and contains `chapter-*` folders.
- **Files not importing**: Check `.yarnyignore` patterns—they might be excluding your files.
- **Story disappears on refresh**: This shouldn't happen—Yarny persists the directory handle. If it does, re-import the project.
- **Can't edit in Yarny**: Make sure you granted read/write permissions when selecting the directory.

