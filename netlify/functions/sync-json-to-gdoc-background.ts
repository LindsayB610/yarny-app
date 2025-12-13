import { OAuth2Client, type Credentials } from "google-auth-library";
import { google } from "googleapis";

import { getAuthenticatedDriveClient, getTokens } from "./drive-client";
import type { NetlifyFunctionContext, NetlifyFunctionEvent } from "./types";
import { createErrorResponse, createSuccessResponse, parseSessionFromEvent } from "./types";

const GDRIVE_CLIENT_ID = (process.env.GDRIVE_CLIENT_ID || "").trim();
const GDRIVE_CLIENT_SECRET = (process.env.GDRIVE_CLIENT_SECRET || "").trim();

/**
 * Background function to sync JSON file content to Google Doc
 * This runs independently of the client connection (up to 15 minutes)
 */
export const handler = async (event: NetlifyFunctionEvent, context: NetlifyFunctionContext) => {
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
    // Parse request body
    let snippetId: string;
    let content: string;
    let gdocFileId: string;
    let parentFolderId: string;

    try {
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      snippetId = body.snippetId;
      content = body.content;
      gdocFileId = body.gdocFileId;
      parentFolderId = body.parentFolderId;

      if (!snippetId || !content || !gdocFileId || !parentFolderId) {
        return createErrorResponse(400, "snippetId, content, gdocFileId, and parentFolderId required");
      }
    } catch (parseError) {
      return createErrorResponse(400, "Invalid request body");
    }

    console.log("Background sync request:", {
      snippetId,
      gdocFileId,
      contentLength: content.length
    });

    // Get authenticated drive client
    const drive = await getAuthenticatedDriveClient(session.email);
    
    // Get OAuth client for Google Docs API
    let oauth2Client: OAuth2Client | null = null;
    if (drive._auth) {
      oauth2Client = drive._auth;
    } else {
      const tokens = await getTokens(session.email);
      if (!tokens?.access_token) {
        throw new Error("No tokens available for Google Docs API");
      }
      oauth2Client = new OAuth2Client(GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET);
      const credentials: Credentials = {
        access_token: tokens.access_token
      };
      if (tokens.refresh_token) {
        credentials.refresh_token = tokens.refresh_token;
      }
      oauth2Client.setCredentials(credentials);
    }

    // Verify credentials
    if (!oauth2Client) {
      throw new Error("OAuth client not initialized for Google Docs");
    }

    let credentials = oauth2Client.credentials;
    if (!credentials?.access_token) {
      const authCredentials = await oauth2Client.getAccessToken();
      if (!authCredentials?.token) {
        throw new Error("Failed to get access token");
      }
      credentials = oauth2Client.credentials;
    }

    // Check if Google Doc exists
    let docExists = false;
    try {
      const existingFile = await drive.files.get({
        fileId: gdocFileId,
        fields: "mimeType, trashed"
      });
      if (!existingFile.data.trashed && existingFile.data.mimeType === "application/vnd.google-apps.document") {
        docExists = true;
      }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === 404) {
        docExists = false;
      } else {
        throw error;
      }
    }

    // Create Google Doc if it doesn't exist
    if (!docExists) {
      const fileMetadata = {
        name: `Snippet ${snippetId}.doc`,
        mimeType: "application/vnd.google-apps.document",
        parents: [parentFolderId]
      };
      const createResponse = await drive.files.create({
        requestBody: fileMetadata,
        fields: "id, name"
      });
      const newFileId = createResponse.data.id;
      if (!newFileId) {
        throw new Error("Failed to create Google Doc");
      }
      gdocFileId = newFileId;
      
      // Small delay to ensure document is initialized
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Update Google Doc content
    const docs = google.docs({ version: "v1", auth: oauth2Client });
    
    // Get current document structure
    const doc = await docs.documents.get({ documentId: gdocFileId });
    const bodyContent = doc.data.body?.content;
    if (!bodyContent || bodyContent.length === 0) {
      throw new Error("Document has no content");
    }
    const lastElement = bodyContent[bodyContent.length - 1];
    if (!lastElement) {
      throw new Error("Document content is empty");
    }
    const endIndex = (lastElement.endIndex || 2) - 1;

    // Delete existing content and insert new content
    const requests = [];
    if (endIndex > 1) {
      requests.push({
        deleteContentRange: {
          range: {
            startIndex: 1,
            endIndex: endIndex
          }
        }
      });
    }
    requests.push({
      insertText: {
        location: {
          index: 1
        },
        text: content
      }
    });

    await docs.documents.batchUpdate({
      documentId: gdocFileId,
      requestBody: {
        requests
      }
    });

    // Get updated file metadata
    const fileMetadata = await drive.files.get({
      fileId: gdocFileId,
      fields: "id, name, modifiedTime"
    });

    console.log("Background sync completed:", {
      snippetId,
      gdocFileId,
      modifiedTime: fileMetadata.data.modifiedTime
    });

    return createSuccessResponse({
      success: true,
      gdocFileId,
      modifiedTime: fileMetadata.data.modifiedTime || new Date().toISOString()
    });
  } catch (error) {
    console.error("Background sync error:", error);
    return createErrorResponse(
      500,
      error instanceof Error ? error.message : "Failed to sync JSON to Google Doc"
    );
  }
};

