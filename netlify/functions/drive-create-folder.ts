import {
  DriveCreateFolderRequestSchema,
  validateRequest
} from "./contract";
import { getAuthenticatedDriveClient } from "./drive-client";
import type {
  NetlifyFunctionEvent,
  NetlifyFunctionContext,
  NetlifyFunctionHandler,
  NetlifyFunctionResponse
} from "./types";
import { parseSessionFromEvent, createErrorResponse, createSuccessResponse } from "./types";

// Helper to add timeout to promises
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(errorMessage ?? "Operation timed out")),
        timeoutMs
      )
    )
  ]);
}

export const handler: NetlifyFunctionHandler = async (
  event: NetlifyFunctionEvent,
  context: NetlifyFunctionContext
): Promise<NetlifyFunctionResponse> => {
  // Set function timeout to use as much time as available
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod !== "POST") {
    return createErrorResponse(405, "Method not allowed");
  }

  const session = parseSessionFromEvent(event);
  if (!session) {
    return createErrorResponse(401, "Not authenticated");
  }

  try {
    // Validate request body with Zod schema
    // Schema handles both 'name' and 'folderName' for backward compatibility
    let name: string;
    let parentFolderId: string | undefined;
    try {
      const validated = validateRequest(
        DriveCreateFolderRequestSchema,
        event.body,
        "folderName (or name) required"
      );
      name = validated.name;
      parentFolderId = validated.parentFolderId;
    } catch (validationError) {
      return createErrorResponse(
        400,
        validationError instanceof Error ? validationError.message : "folderName (or name) required"
      );
    }

    const folderName = name; // Use normalized 'name' field from schema
    console.log("Creating folder:", folderName, "parentFolderId:", parentFolderId);

    // Get authenticated drive client with timeout (max 8 seconds to leave buffer for response)
    const drive = await withTimeout(
      getAuthenticatedDriveClient(session.email),
      8000,
      "Drive client authentication timed out"
    );

    // Check if folder already exists (with timeout)
    const escapedFolderName = folderName.replace(/'/g, "\\'");
    const query = parentFolderId
      ? `name='${escapedFolderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `name='${escapedFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    console.log("Checking for existing folder...");
    const existingFolders = await withTimeout(
      drive.files.list({
        q: query,
        fields: "files(id, name)"
      }),
      8000,
      "Folder check timed out"
    );

    if (existingFolders.data.files && existingFolders.data.files.length > 0) {
      // Folder already exists, return it
      const existingFolder = existingFolders.data.files?.[0];
      if (existingFolder?.id) {
        console.log("Folder already exists:", existingFolder.id);
        return createSuccessResponse({
          id: existingFolder.id,
          name: existingFolder.name ?? folderName,
          created: false
        });
      }
    }

    // Create new folder (with timeout)
    console.log("Creating new folder...");
    const folderMetadata: {
      name: string;
      mimeType: string;
      parents?: string[];
    } = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder"
    };

    if (parentFolderId) {
      folderMetadata.parents = [parentFolderId];
    }

    const response = await withTimeout(
      drive.files.create({
        requestBody: folderMetadata,
        fields: "id, name, createdTime"
      }),
      8000,
      "Folder creation timed out"
    );

    console.log("Folder created successfully:", response.data.id);
    return createSuccessResponse({
      id: response.data.id ?? "",
      name: response.data.name ?? folderName,
      created: true
    });
  } catch (error) {
    console.error("Drive create folder error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create folder";

    // Check if it's a timeout error
    if (errorMessage.includes("timed out") || errorMessage.includes("timeout")) {
      return createErrorResponse(504, "Request timed out. Please try again.");
    }

    return createErrorResponse(500, errorMessage);
  }
};

