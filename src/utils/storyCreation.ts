import { apiClient } from "../api/client";

interface DriveScopeError extends Error {
  code?: string;
  requiresReauth?: boolean;
}

/**
 * Get a random opening sentence for new stories
 * These match the opening sentences from the legacy implementation
 */
const OPENING_SENTENCES = [
  "The last time the moon fell, everyone pretended not to notice.",
  "Somewhere between the third apocalypse and my morning coffee, I decided to try optimism again.",
  "Nobody told the robots that the war was over, so they kept sending apology letters.",
  "I woke up as someone else's dream, and it was already going badly.",
  "The town smelled like secrets and fresh asphalt.",
  "When Grandma's ghost started texting, I knew the séance had worked too well.",
  "It was the kind of rain that made even the sins look clean.",
  "The cat had been mayor for six years before anyone noticed the fraud.",
  "The ship was sinking, but the captain was more concerned about the Wi-Fi.",
  "I wasn't born evil; I just filled out the wrong paperwork.",
  "There was blood in the butter, and everyone pretended it was jam.",
  "Every map lied in a slightly different way.",
  "I met my clone in the cereal aisle, and she looked furious.",
  "The stars had been hacked again.",
  "Nobody in the village had seen the sun since the mayor sold it.",
  "I married a time traveler, but the anniversaries are murder.",
  "The library hummed softly, dreaming of revolution.",
  "My reflection blinked first.",
  "The baby dragon was not house-trained, and neither was I.",
  "We buried the king twice, just to be sure."
];

function getRandomOpeningSentence(): string {
  return OPENING_SENTENCES[Math.floor(Math.random() * OPENING_SENTENCES.length)];
}

/**
 * Get current date in US Pacific time
 */
function getPacificDate(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export interface StoryMetadata {
  genre?: string;
  description?: string;
  wordGoal?: number;
  goal?: {
    target: number;
    deadline: string;
    writingDays: boolean[];
    daysOff: string[];
    mode: "elastic" | "strict";
  };
}

/**
 * Initialize story structure - creates folders and files for a new story
 */
export async function initializeStoryStructure(
  storyFolderId: string,
  metadata: StoryMetadata = {}
): Promise<void> {
  // Create initial folder structure
  const folders = [
    { name: "Chapters", description: "Story chapters" },
    { name: "People", description: "People notes" },
    { name: "Places", description: "Places notes" },
    { name: "Things", description: "Things notes" }
  ];

  // Create all main folders in parallel
  const folderPromises = folders.map((folder) =>
    apiClient
      .createDriveFolder({
        name: folder.name,
        parentFolderId: storyFolderId
      })
      .then((result) => ({ name: folder.name, id: result.id }))
  );
  const folderResults = await Promise.all(folderPromises);
  const createdFolders: Record<string, string> = {};
  folderResults.forEach(({ name, id }) => {
    createdFolders[name] = id;
  });

  // Create a sample chapter (group) and snippet with random opening sentence
  const randomOpening = getRandomOpeningSentence();
  const groupId = "group_" + Date.now();
  const snippetId = "snippet_" + Date.now();

  // Create initial project.json file data
  const projectData = {
    name: "New Project",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activeSnippetId: snippetId,
    snippetIds: [snippetId],
    groupIds: [groupId],
    wordGoal: metadata.wordGoal || 3000,
    genre: metadata.genre || "",
    description: metadata.description || ""
  };

  // Create Chapter 1 folder and project.json in parallel
  const [chapter1Folder] = await Promise.all([
    apiClient.createDriveFolder({
      name: "Chapter 1",
      parentFolderId: createdFolders["Chapters"]
    }),
    apiClient.writeDriveFile({
      fileName: "project.json",
      content: JSON.stringify(projectData, null, 2),
      parentFolderId: storyFolderId
    })
  ]);

  // Create initial data.json file with sample snippet and group
  const initialState = {
    snippets: {
      [snippetId]: {
        id: snippetId,
        projectId: "default",
        groupId: groupId,
        title: "Opening Scene",
        body: randomOpening,
        words: randomOpening.split(/\s+/).length,
        chars: randomOpening.length,
        updatedAt: new Date().toISOString(),
        version: 1,
        driveFileId: null
      }
    },
    groups: {
      [groupId]: {
        id: groupId,
        projectId: "default",
        title: "Chapter 1",
        color: "#10B981",
        position: 0,
        snippetIds: [snippetId],
        driveFolderId: chapter1Folder.id
      }
    },
    notes: {
      people: {},
      places: {},
      things: {}
    }
  };

  // Create data.json and Opening Scene doc in parallel
  try {
    if (chapter1Folder && chapter1Folder.id) {
      const [docResult] = await Promise.all([
        apiClient.writeDriveFile({
          fileName: "Opening Scene.doc",
          content: randomOpening,
          parentFolderId: chapter1Folder.id,
          mimeType: "application/vnd.google-apps.document"
        }),
        apiClient.writeDriveFile({
          fileName: "data.json",
          content: JSON.stringify(initialState, null, 2),
          parentFolderId: storyFolderId
        })
      ]);

      // Update the snippet with the Drive file ID
      initialState.snippets[snippetId].driveFileId = docResult.id;

      // Update data.json with the file ID (must happen after doc creation)
      await apiClient.writeDriveFile({
        fileName: "data.json",
        content: JSON.stringify(initialState, null, 2),
        parentFolderId: storyFolderId
      });
    } else {
      console.error("Chapters folder ID not found");
      // Still create data.json even if chapter folder creation failed
      await apiClient.writeDriveFile({
        fileName: "data.json",
        content: JSON.stringify(initialState, null, 2),
        parentFolderId: storyFolderId
      });
    }
  } catch (error) {
    console.error("Error creating opening scene Google Doc:", error);
    // Log error but continue - the data.json has the content
    // Check if this is a scope issue
    if (error instanceof Error) {
      const scopeError = error as DriveScopeError;
      const requiresReauth =
        scopeError.message.includes("MISSING_DOCS_SCOPE") ||
        scopeError.code === "MISSING_DOCS_SCOPE" ||
        scopeError.requiresReauth;
      if (requiresReauth) {
        const reauthError: DriveScopeError = new Error(
        "MISSING_DOCS_SCOPE: OAuth tokens are missing Google Docs API scope. Please re-authorize Drive access."
      );
        reauthError.code = "MISSING_DOCS_SCOPE";
        reauthError.requiresReauth = true;
        throw reauthError;
      }
    }
    // For other errors, log them but continue - the data.json has the content
    console.warn(
      "Failed to create Opening Scene Google Doc - story will be created but snippet may not display correctly"
    );
  }

  // Create goal.json if goal metadata is provided
  if (metadata.goal?.deadline) {
    const today = getPacificDate();
    const goalData = {
      target: metadata.goal.target || metadata.wordGoal || 3000,
      deadline: metadata.goal.deadline,
      startDate: today,
      writingDays: metadata.goal.writingDays || [
        true,
        true,
        true,
        true,
        true,
        true,
        true
      ],
      daysOff: metadata.goal.daysOff || [],
      mode: metadata.goal.mode || "elastic",
      ledger: {},
      lastCalculatedDate: today
    };

    try {
      await apiClient.writeDriveFile({
        fileName: "goal.json",
        content: JSON.stringify(goalData, null, 2),
        parentFolderId: storyFolderId,
        mimeType: "text/plain"
      });
    } catch (error) {
      console.warn("Failed to create goal.json (non-critical):", error);
      // Don't throw - goal.json is optional
    }
  }
}

