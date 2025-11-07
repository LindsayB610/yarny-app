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
  if (event.httpMethod !== "POST" && event.httpMethod !== "DELETE") {
    return createErrorResponse(405, "Method not allowed");
  }

  const session = parseSessionFromEvent(event);
  if (!session) {
    return createErrorResponse(401, "Not authenticated");
  }

  try {
    if (!event.body) {
      return createErrorResponse(400, "storyFolderId required");
    }

    const { storyFolderId, deleteFromDrive } = JSON.parse(event.body) as {
      storyFolderId?: string;
      deleteFromDrive?: boolean;
    };

    if (!storyFolderId) {
      return createErrorResponse(400, "storyFolderId required");
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

