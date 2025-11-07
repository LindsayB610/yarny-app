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

    const { folderId, pageToken } = event.queryStringParameters || {};

    const query = folderId
      ? `'${folderId}' in parents and trashed=false`
      : "trashed=false";

    const response = await drive.files.list({
      q: query,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime, size, trashed)",
      pageSize: 100,
      pageToken: pageToken || undefined,
      orderBy: "modifiedTime desc"
    });

    return createSuccessResponse(response.data);
  } catch (error) {
    console.error("Drive list error:", error);
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : "Failed to list files"
    );
  }
};

