# Yarny Test Corpus

This directory contains test corpus projects for validating Drive I/O, text extraction, performance, and export functionality. These projects are designed to be uploaded to Google Drive for comprehensive testing.

## Test Corpus Projects

### test-small (sample-project)
- **Status**: ✅ Exists
- **Structure**: 1 story, 2 snippets
- **Purpose**: Basic smoke tests and validation
- **Location**: `sample-project/`

### test-medium
- **Status**: ✅ Generated
- **Structure**: 
  - 1 story
  - 10 chapters
  - 8 snippets per chapter (80 total chapter snippets)
  - 10 People notes
  - 10 Places notes
  - 10 Things notes
  - ~25,000 words total
- **Purpose**: Realistic project size, performance testing
- **Location**: `test-medium/`

### test-large
- **Status**: ✅ Generated
- **Structure**:
  - 1 story
  - 25 chapters
  - 15 snippets per chapter (375 total chapter snippets)
  - **1 very large chapter**: Chapter 13 has 55 snippets (tests export chunking)
  - 25 People notes
  - 25 Places notes
  - 25 Things notes
  - ~100,000 words total
  - **Total**: 430 chapter snippets + 75 notes = 505 total snippets
- **Purpose**: Stress testing, virtualization validation, lazy loading, export chunking validation
- **Location**: `test-large/`

## Drive Folder Structure

Create a top-level folder in Google Drive named **Yarny Test Corpus** with the following structure:

```
Yarny Test Corpus/
├── test-small/
│   ├── Chapters/
│   │   ├── Chapter 1/
│   │   │   └── snippet files (Google Docs)
│   ├── People/
│   ├── Places/
│   ├── Things/
│   ├── project.json
│   ├── data.json
│   └── goal.json
├── test-medium/
│   └── (same structure, more content)
└── test-large/
    └── (same structure, much more content)
```

Each text file should use plain UTF-8 text and Unix (`\n`) newlines so TipTap plain text mode can round-trip without mutation.

## Local Source Files

Each test corpus project contains:
- `metadata.json` — normalized IDs for projects, stories, chapters, snippets, and notes
- `chapters/chapter-*/snippet-*.txt` — chapter snippet content (to be uploaded as Google Docs)
- `people/person-*.txt` — People notes (to be uploaded as text files)
- `places/place-*.txt` — Places notes (to be uploaded as text files)
- `things/thing-*.txt` — Things notes (to be uploaded as text files)

## Generating Test Corpus

To generate or regenerate the test corpus files:

```bash
cd test-corpus
node generate-test-corpus.js
```

This will create all necessary files for `test-medium` and `test-large` projects.

## How to Publish

1. **Generate the corpus** (if not already done):
   ```bash
   cd test-corpus
   node generate-test-corpus.js
   ```

2. **Upload to Google Drive**:
   - Create a folder named "Yarny Test Corpus" in Google Drive
   - For each test project (test-small, test-medium, test-large):
     - Create a story folder in Drive
     - Upload chapter snippets as Google Docs (in chapter subfolders)
     - Upload People/Places/Things notes as text files
     - Create `project.json`, `data.json`, and `goal.json` files with proper structure

3. **Update metadata files**:
   - Replace `REPLACE_WITH_DRIVE_FOLDER_ID` placeholders in `metadata.json` files with actual Drive folder IDs

4. **Share the folder**:
   - Share the `Yarny Test Corpus` folder with the engineering team
   - Record the Drive folder ID in your `.env` file as `VITE_TEST_CORPUS_FOLDER_ID`

5. **Use in tests**:
   - Use the IDs from `metadata.json` when seeding Netlify functions or MSW handlers
   - Reference the test corpus in smoke tests and performance tests

## Smoke Test Coverage

The accompanying smoke test checklist (`react-migration/smoke-tests-phase-1.md`) and comprehensive smoke tests in `REACT_MIGRATION_PLAN.md` reference this corpus for validation scenarios.

### Test Coverage by Project Size

- **test-small**: Fast smoke tests, basic operations, format normalization, IME composition, RTL handling
- **test-medium**: Realistic project size, performance testing, export operations
- **test-large**: Stress testing, virtualization validation, lazy loading, export chunking (especially Chapter 13 with 50+ snippets)

