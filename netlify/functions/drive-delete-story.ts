import {
  DriveDeleteStoryRequestSchema,
  validateRequest
} from "./contract";
import { getAuthenticatedDriveClient } from "./drive-client";
import type {
  NetlifyFunctionEvent,
  NetlifyFunctionHandler,
  NetlifyFunctionResponse
} from "./types";
import { parseSessionFromEvent, createErrorResponse, createSuccessResponse } from "./types";

export const handler: NetlifyFunctionHandler = async (
  event: NetlifyFunctionEvent
): Promise<NetlifyFunctionResponse> => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "DELETE") {
    return createErrorResponse(405, "Method not allowed");
  }

  const session = parseSessionFromEvent(event);
  if (!session) {
    return createErrorResponse(401, "Not authenticated");
  }

  try {
    // Validate request body with Zod schema
    let storyFolderId: string;
    let deleteFromDrive: boolean | undefined;
    try {
      const validated = validateRequest(
        DriveDeleteStoryRequestSchema,
        event.body,
        "storyFolderId required"
      );
      storyFolderId = validated.storyFolderId;
      deleteFromDrive = validated.deleteFromDrive;
    } catch (validationError) {
      return createErrorResponse(
        400,
        validationError instanceof Error ? validationError.message : "storyFolderId required"
      );
    }

    const drive = await getAuthenticatedDriveClient(session.email);

    if (deleteFromDrive) {
      // Permanently delete the folder from Google Drive
      await drive.files.delete({
        fileId: storyFolderId
      });

      return createSuccessResponse({
        success: true,
        message: "Story deleted from Google Drive",
        deletedFromDrive: true
      });
    } else {
      // Just trash the folder (soft delete - can be recovered)
      await drive.files.update({
        fileId: storyFolderId,
        requestBody: {
          trashed: true
        }
      });

      return createSuccessResponse({
        success: true,
        message: "Story moved to trash",
        deletedFromDrive: false
      });
    }
  } catch (error) {
    console.error("Drive delete story error:", error);
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : "Failed to delete story"
    );
  }
};

