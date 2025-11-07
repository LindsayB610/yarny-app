# Yarny Test Corpus

Phase 1 requires a shared baseline of Google Drive fixtures to validate Drive I/O and text extraction utilities. This directory stores local source material that can be copied into Google Drive to create synchronized fixtures.

## Drive Folder Structure

Create a top-level folder in Google Drive named **Yarny Test Corpus** with the following structure:

- `Sample Project`
  - `Stories`
    - `Welcome to Yarny.txt`
    - `Character Seeds.txt`
  - `metadata.json`

Each `.txt` file should use plain UTF-8 text and Unix (`\n`) newlines so TipTap plain text mode can round-trip without mutation.

## Local Source Files

- `sample-project/metadata.json` — normalized IDs for projects, stories, and snippets that align with the React store scaffolding.
- `sample-project/stories/*.txt` — plain text inputs that mirror Google Docs exports.

## How to Publish

1. Copy the contents of `sample-project` from this repo into the Google Drive folder.
2. Share the `Yarny Test Corpus` folder with the engineering team.
3. Record the Drive folder ID in your `.env` file as `VITE_TEST_CORPUS_FOLDER_ID`.
4. Use the IDs from `metadata.json` when seeding the new Netlify functions or MSW handlers.

## Smoke Test Coverage

The accompanying smoke test checklist (`react-migration/smoke-tests-phase-1.md`) references this corpus for validation scenarios.

