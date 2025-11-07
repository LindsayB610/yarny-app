import { google } from "googleapis";

import {
  DriveReadRequestSchema,
  validateRequest
} from "./contract";
import { getAuthenticatedDriveClient, type DriveClientWithAuth } from "./drive-client";
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
        DriveReadRequestSchema,
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

    // Get file metadata first
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: "id, name, mimeType, modifiedTime"
    });

    let content = "";

    // Handle Google Docs differently
    if (fileMetadata.data.mimeType === "application/vnd.google-apps.document") {
      // Export Google Doc as plain text
      const auth = (drive as DriveClientWithAuth)._auth;
      if (!auth) {
        throw new Error("Drive client auth not available");
      }

      const docs = google.docs({ version: "v1", auth });

      const doc = await docs.documents.get({
        documentId: fileId
      });

      // Extract text from document
      if (doc.data.body?.content) {
        content = doc.data.body.content
          .map((element) => {
            if (element.paragraph?.elements) {
              return element.paragraph.elements
                .map((elem) => (elem.textRun ? elem.textRun.content : ""))
                .join("");
            }
            return "";
          })
          .join("\n")
          .trim();
      }
    } else {
      // Download regular file content
      const fileContent = await drive.files.get(
        { fileId: fileId, alt: "media" },
        { responseType: "arraybuffer" }
      );

      // Convert buffer to string (assuming text files)
      if (fileContent.data instanceof ArrayBuffer) {
        content = Buffer.from(fileContent.data).toString("utf8");
      } else if (typeof fileContent.data === "string") {
        content = fileContent.data;
      }
    }

    return createSuccessResponse({
      id: fileMetadata.data.id || "",
      name: fileMetadata.data.name || "",
      mimeType: fileMetadata.data.mimeType || "",
      modifiedTime: fileMetadata.data.modifiedTime || "",
      content: content
    });
  } catch (error) {
    console.error("Drive read error:", error);
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : "Failed to read file"
    );
  }
};

