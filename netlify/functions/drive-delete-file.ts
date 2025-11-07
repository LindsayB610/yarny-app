import {
  DriveDeleteFileRequestSchema,
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
    let fileId: string;
    try {
      const validated = validateRequest(
        DriveDeleteFileRequestSchema,
        event.body,
        "fileId required"
      );
      fileId = validated.fileId;
    } catch (validationError) {
      return createErrorResponse(
        400,
        validationError instanceof Error ? validationError.message : "fileId required"
      );
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

