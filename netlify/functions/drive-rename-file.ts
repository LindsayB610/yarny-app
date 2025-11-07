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
      return createErrorResponse(400, "fileId and fileName required");
    }

    const { fileId, fileName } = JSON.parse(event.body) as {
      fileId?: string;
      fileName?: string;
    };

    if (!fileId || !fileName) {
      return createErrorResponse(400, "fileId and fileName required");
    }

    const drive = await getAuthenticatedDriveClient(session.email);

    // Update file name
    await drive.files.update({
      fileId: fileId,
      requestBody: {
        name: fileName
      }
    });

    return createSuccessResponse({
      id: fileId,
      name: fileName
    });
  } catch (error) {
    console.error("Drive rename file error:", error);
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : "Failed to rename file"
    );
  }
};

