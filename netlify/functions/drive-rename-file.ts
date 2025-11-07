import {
  DriveRenameFileRequestSchema,
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
  if (event.httpMethod !== "POST") {
    return createErrorResponse(405, "Method not allowed");
  }

  const session = parseSessionFromEvent(event);
  if (!session) {
    return createErrorResponse(401, "Not authenticated");
  }

  try {
    // Validate request body with Zod schema
    // Schema handles both 'newName' and 'fileName' for backward compatibility
    let fileId: string;
    let newName: string;
    try {
      const validated = validateRequest(
        DriveRenameFileRequestSchema,
        event.body,
        "fileId and fileName (or newName) required"
      );
      fileId = validated.fileId;
      newName = validated.newName;
    } catch (validationError) {
      return createErrorResponse(
        400,
        validationError instanceof Error ? validationError.message : "fileId and fileName (or newName) required"
      );
    }

    const drive = await getAuthenticatedDriveClient(session.email);

    // Update file name
    await drive.files.update({
      fileId: fileId,
      requestBody: {
        name: newName
      }
    });

    return createSuccessResponse({
      id: fileId,
      name: newName
    });
  } catch (error) {
    console.error("Drive rename file error:", error);
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : "Failed to rename file"
    );
  }
};

