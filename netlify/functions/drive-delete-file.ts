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
  if (event.httpMethod !== "POST") {
    return createErrorResponse(405, "Method not allowed");
  }

  const session = parseSessionFromEvent(event);
  if (!session) {
    return createErrorResponse(401, "Not authenticated");
  }

  try {
    if (!event.body) {
      return createErrorResponse(400, "fileId required");
    }

    const { fileId } = JSON.parse(event.body) as { fileId?: string };

    if (!fileId) {
      return createErrorResponse(400, "fileId required");
    }

    const drive = await getAuthenticatedDriveClient(session.email);

    // Move file to trash (soft delete - can be recovered)
    await drive.files.update({
      fileId: fileId,
      requestBody: {
        trashed: true
      }
    });

    return createSuccessResponse({
      success: true,
      message: "File moved to trash"
    });
  } catch (error) {
    console.error("Drive delete file error:", error);
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : "Failed to delete file"
    );
  }
};

