import type { drive_v3 } from "googleapis";

import {
  DriveListQueryParamsSchema,
  validateQueryParams
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
  if (event.httpMethod !== "GET") {
    return createErrorResponse(405, "Method not allowed");
  }

  const session = parseSessionFromEvent(event);
  if (!session) {
    return createErrorResponse(401, "Not authenticated");
  }

  console.log("Drive list - looking for tokens for email:", session.email);

  try {
    const drive = await getAuthenticatedDriveClient(session.email);

    // Validate query parameters with Zod schema
    let folderId: string | undefined;
    let pageToken: string | undefined;
    try {
      const validated = validateQueryParams(
        DriveListQueryParamsSchema,
        event.queryStringParameters,
        "Invalid query parameters"
      );
      folderId = validated.folderId;
      pageToken = validated.pageToken;
    } catch (validationError) {
      return createErrorResponse(
        400,
        validationError instanceof Error ? validationError.message : "Invalid query parameters"
      );
    }

    const query = folderId
      ? `'${folderId}' in parents and trashed=false`
      : "trashed=false";

    const listParams: drive_v3.Params$Resource$Files$List = {
      q: query,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime, size, trashed)",
      pageSize: 100,
      orderBy: "modifiedTime desc"
    };
    if (pageToken) {
      listParams.pageToken = pageToken;
    }

    const response = await drive.files.list(listParams);

    if (!response.data) {
      throw new Error("Drive API returned no data");
    }
    return createSuccessResponse(response.data);
  } catch (error) {
    console.error("Drive list error:", error);
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : "Failed to list files"
    );
  }
};

