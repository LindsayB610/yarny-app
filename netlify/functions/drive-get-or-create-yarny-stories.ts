import type {
  NetlifyFunctionEvent,
  NetlifyFunctionHandler,
  NetlifyFunctionResponse
} from "./types";
import { parseSessionFromEvent, createErrorResponse, createSuccessResponse } from "./types";
import { getAuthenticatedDriveClient } from "./drive-client";

export const handler: NetlifyFunctionHandler = async (
  event: NetlifyFunctionEvent
): Promise<NetlifyFunctionResponse> => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return createErrorResponse(405, "Method not allowed");
  }

  const session = parseSessionFromEvent(event);
  if (!session) {
    return createErrorResponse(401, "Not authenticated");
  }

  try {
    const drive = await getAuthenticatedDriveClient(session.email);
    const YARNY_STORIES_FOLDER = "Yarny Stories";
    const OLD_YARNY_FOLDER = "Yarny"; // Legacy folder name for migration

    // Escape single quotes in folder names for the query
    const escapeQuery = (name: string) => name.replace(/'/g, "\\'");

    // OPTIMIZATION: Search for both folder names in a single query
    // This reduces API calls from 2 to 1 for new accounts
    const escapedNew = escapeQuery(YARNY_STORIES_FOLDER);
    const escapedOld = escapeQuery(OLD_YARNY_FOLDER);
    const query = `(name='${escapedNew}' or name='${escapedOld}') and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    console.log(
      `Searching for "${YARNY_STORIES_FOLDER}" or "${OLD_YARNY_FOLDER}" folder for user ${session.email}`
    );
    const existingFolders = await drive.files.list({
      q: query,
      fields: "files(id, name)",
      spaces: "drive"
    });

    // Check if "Yarny Stories" folder exists (new name - preferred)
    const newFolder = existingFolders.data.files?.find(
      (f) => f.name === YARNY_STORIES_FOLDER
    );
    if (newFolder && newFolder.id) {
      console.log(`Found "${YARNY_STORIES_FOLDER}" folder: ${newFolder.id}`);
      return createSuccessResponse({
        id: newFolder.id,
        name: newFolder.name || YARNY_STORIES_FOLDER,
        created: false
      });
    }

    // Check if old "Yarny" folder exists (migration)
    const oldFolder = existingFolders.data.files?.find(
      (f) => f.name === OLD_YARNY_FOLDER
    );
    if (oldFolder && oldFolder.id) {
      console.log(
        `Found old "${OLD_YARNY_FOLDER}" folder (id: ${oldFolder.id}), migrating to "${YARNY_STORIES_FOLDER}" for user ${session.email}`
      );

      try {
        await drive.files.update({
          fileId: oldFolder.id,
          requestBody: {
            name: YARNY_STORIES_FOLDER
          }
        });
        console.log(`Successfully renamed folder to "${YARNY_STORIES_FOLDER}"`);

        return createSuccessResponse({
          id: oldFolder.id,
          name: YARNY_STORIES_FOLDER,
          created: false,
          migrated: true
        });
      } catch (updateError) {
        console.error("Failed to rename folder:", updateError);
        throw new Error(
          `Failed to rename folder: ${updateError instanceof Error ? updateError.message : String(updateError)}`
        );
      }
    }

    // Neither folder exists, create "Yarny Stories"
    const folderMetadata = {
      name: YARNY_STORIES_FOLDER,
      mimeType: "application/vnd.google-apps.folder"
    };

    const response = await drive.files.create({
      requestBody: folderMetadata,
      fields: "id, name, createdTime"
    });

    return createSuccessResponse({
      id: response.data.id || "",
      name: response.data.name || YARNY_STORIES_FOLDER,
      created: true
    });
  } catch (error) {
    console.error("Drive get/create Yarny Stories folder error:", error);
    return createErrorResponse(
      500,
      error instanceof Error
        ? error.message
        : "Failed to get or create Yarny Stories folder"
    );
  }
};

