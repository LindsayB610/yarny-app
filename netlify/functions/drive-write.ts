import { getStore } from "@netlify/blobs";
import { OAuth2Client, type Credentials } from "google-auth-library";
import { google } from "googleapis";
import { Readable } from "stream";

import {
  DriveWriteRequestSchema,
  validateRequest
} from "./contract";
import {
  getAuthenticatedDriveClient,
  getTokens
} from "./drive-client";
import type {
  NetlifyFunctionEvent,
  NetlifyFunctionContext,
  NetlifyFunctionHandler,
  NetlifyFunctionResponse
} from "./types";
import { parseSessionFromEvent, createErrorResponse, createSuccessResponse } from "./types";

// Helper to add timeout to promises
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(errorMessage ?? "Operation timed out")),
        timeoutMs
      )
    )
  ]);
}

const GDRIVE_CLIENT_ID = (process.env.GDRIVE_CLIENT_ID ?? "").trim();
const GDRIVE_CLIENT_SECRET = (process.env.GDRIVE_CLIENT_SECRET ?? "").trim();
const STORAGE_KEY = "drive_tokens.json";

export const handler: NetlifyFunctionHandler = async (
  event: NetlifyFunctionEvent,
  context: NetlifyFunctionContext
): Promise<NetlifyFunctionResponse> => {
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
    // Validate request body with Zod schema
    let fileId: string | undefined;
    let fileName: string;
    let content: string;
    let parentFolderId: string | undefined;
    let mimeType: string;
    try {
      const validated = validateRequest(
        DriveWriteRequestSchema,
        event.body,
        "fileName and content required"
      );
      fileId = validated.fileId;
      fileName = validated.fileName;
      content = validated.content;
      parentFolderId = validated.parentFolderId;
      mimeType = validated.mimeType ?? "text/plain"; // Using ?? for default value assignment
    } catch (validationError) {
      return createErrorResponse(
        400,
        validationError instanceof Error ? validationError.message : "fileName and content required"
      );
    }

    console.log("Drive write request:", {
      fileName,
      fileId,
      isGoogleDoc: mimeType === "application/vnd.google-apps.document",
      contentLength: content?.length
    });

    // Get authenticated drive client - this will refresh tokens if needed (with timeout)
    const drive = await withTimeout(
      getAuthenticatedDriveClient(session.email),
      8000,
      "Drive client authentication timed out"
    );
    const isGoogleDoc = mimeType === "application/vnd.google-apps.document";

    // For Google Docs, we need the OAuth client to use the Docs API
    // Get it from getAuthenticatedDriveClient or create a new one
    let oauth2Client: OAuth2Client | null = null;
    if (isGoogleDoc) {
      // Try to get auth from drive._auth (should be attached by getAuthenticatedDriveClient)
      if ((drive)._auth) {
        oauth2Client = (drive)._auth!;
        console.log("Using auth client from drive._auth");
      } else {
        // Fallback: recreate the OAuth client from stored tokens
        console.log("drive._auth not found, creating new OAuth client from tokens");
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

        console.log("Created new OAuth client");
      }

      // Check if credentials are set
      if (!oauth2Client) {
        throw new Error("OAuth client not initialized for Google Docs");
      }

      let credentials = oauth2Client.credentials;
      if (!credentials?.access_token) {
        console.log("Credentials missing or expired, attempting to get access token...");
        // Try to get/refresh access token
        try {
          const authCredentials = await oauth2Client.getAccessToken();
          if (authCredentials?.token) {
            console.log("Successfully retrieved access token");
            // Credentials should now be set by getAccessToken
            credentials = oauth2Client.credentials;
            if (!credentials?.access_token) {
              throw new Error("Access token retrieved but credentials not set");
            }
          } else {
            throw new Error("Failed to get access token");
          }
        } catch (tokenError) {
          console.error("Error getting access token:", tokenError);
          throw new Error(
            "Authentication client not properly initialized - failed to get access token: " +
              (tokenError instanceof Error ? tokenError.message : String(tokenError))
          );
        }
      }

      console.log("Auth client verified - has credentials:", !!oauth2Client.credentials?.access_token);
    }

    if (fileId) {
      // Update existing file
      // First check if the file exists - if not, we'll need to create a new one
      let fileExists = false;
      try {
        const existingFile = await drive.files.get({
          fileId: fileId,
          fields: "mimeType, trashed"
        });
        // Check if file is trashed
        if (existingFile.data.trashed) {
          fileExists = false;
        } else {
          fileExists = true;
        }
      } catch (error) {
        // File not found (404) or other error - treat as if file doesn't exist
        const err = error as { code?: number | string; response?: { status?: number }; message?: string };
        const errorCode = err.code ?? err.response?.status;
        const errorMessage = err.message ?? "";
        if (
          errorCode === 404 ||
          errorMessage.includes("not found") ||
          errorMessage.includes("does not exist")
        ) {
          fileExists = false;
          console.log(`File ${fileId} not found or deleted, will create new file`);
        } else {
          // Re-throw other errors
          throw error;
        }
      }

      if (!fileExists) {
        // File was deleted, return error code indicating we should create new file
        return createErrorResponse(404, "FILE_NOT_FOUND", "File was deleted or does not exist");
      }

      if (isGoogleDoc && oauth2Client) {
        // For Google Docs, we need to use batchUpdate to replace content
        // Get current document to check if it exists (we already verified it exists above)
        const existingFile = await drive.files.get({
          fileId: fileId,
          fields: "mimeType"
        });

        if (existingFile.data.mimeType === "application/vnd.google-apps.document") {
          // Clear existing content and insert new content
          // Use Google Docs API to update content
          const docs = google.docs({ version: "v1", auth: oauth2Client });

          // Get current document
          const doc = await docs.documents.get({ documentId: fileId });
          const bodyContent = doc.data.body?.content;
          if (!bodyContent || bodyContent.length === 0) {
            throw new Error("Document has no content");
          }
          const lastElement = bodyContent[bodyContent.length - 1];
          if (!lastElement) {
            throw new Error("Document content is empty");
          }
          const endIndex = (lastElement.endIndex ?? 2) - 1;

          // Delete all content except first paragraph
          if (endIndex > 1) {
            await docs.documents.batchUpdate({
              documentId: fileId,
              requestBody: {
                requests: [
                  {
                    deleteContentRange: {
                      range: {
                        startIndex: 1,
                        endIndex: endIndex
                      }
                    }
                  },
                  {
                    insertText: {
                      location: {
                        index: 1
                      },
                      text: content
                    }
                  }
                ]
              }
            });
          } else {
            // Document is empty, just insert
            await docs.documents.batchUpdate({
              documentId: fileId,
              requestBody: {
                requests: [
                  {
                    insertText: {
                      location: {
                        index: 1
                      },
                      text: content
                    }
                  }
                ]
              }
            });
          }
        } else {
          // Not a Google Doc, update as regular file
          const fileBuffer = Buffer.from(content, "utf8");
          const fileStream = Readable.from(fileBuffer);
          await drive.files.update({
            fileId: fileId,
            media: {
              mimeType: mimeType,
              body: fileStream
            }
          });
        }
      } else {
        // Regular file update
        const fileBuffer = Buffer.from(content, "utf8");
        const fileStream = Readable.from(fileBuffer);
        await drive.files.update({
          fileId: fileId,
          media: {
            mimeType: mimeType,
            body: fileStream
          }
        });
      }

      const fileMetadata = await drive.files.get({
        fileId: fileId,
        fields: "id, name, modifiedTime"
      });

      return createSuccessResponse({
        id: fileMetadata.data.id ?? "",
        name: fileMetadata.data.name ?? "",
        modifiedTime: fileMetadata.data.modifiedTime ?? ""
      });
    } else {
      // Create new file
      if (isGoogleDoc && oauth2Client) {
        // Create empty Google Doc first
        const fileMetadata: {
          name: string;
          mimeType: string;
          parents?: string[];
        } = {
          name: fileName,
          mimeType: "application/vnd.google-apps.document"
        };

        if (parentFolderId) {
          fileMetadata.parents = [parentFolderId];
        }

        const response = await drive.files.create({
          requestBody: fileMetadata,
          fields: "id, name, modifiedTime"
        });

        // Add content to the Google Doc
        if (content?.trim()) {
          const docs = google.docs({ version: "v1", auth: oauth2Client });

          // Small delay to ensure the document is fully initialized
          await new Promise((resolve) => setTimeout(resolve, 1000));

          try {
            // Get the document structure
            const doc = await docs.documents.get({ documentId: response.data.id ?? "" });
            console.log(
              "Google Doc structure (first 500 chars):",
              JSON.stringify(doc.data.body, null, 2).substring(0, 500)
            );

            // Find the end of the document body
            let endIndex = 1;
            const bodyContent = doc.data.body?.content;
            if (bodyContent && bodyContent.length > 0) {
              const lastElement = bodyContent[bodyContent.length - 1];
              if (lastElement) {
                endIndex = (lastElement.endIndex ?? 2) - 1;
                console.log("Document endIndex:", endIndex);
              }
            }

            // Strategy: Delete everything from index 1 to end, then insert our text at index 1
            const requests: Array<{
              deleteContentRange?: {
                range: { startIndex: number; endIndex: number };
              };
              insertText?: { location: { index: number }; text: string };
            }> = [];

            if (endIndex > 1) {
              console.log("Deleting existing content from index 1 to", endIndex);
              requests.push({
                deleteContentRange: {
                  range: {
                    startIndex: 1,
                    endIndex: endIndex
                  }
                }
              });
            }

            // Insert the new content at index 1
            console.log(
              "Inserting text at index 1, length:",
              content.length,
              "First 50:",
              content.substring(0, 50)
            );
            requests.push({
              insertText: {
                location: {
                  index: 1
                },
                text: content
              }
            });

            // Execute both operations in a single batchUpdate
            await docs.documents.batchUpdate({
              documentId: response.data.id ?? "",
              requestBody: {
                requests: requests
              }
            });

            // Wait a bit for the update to propagate
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Verify the content was inserted
            const verifyDoc = await docs.documents.get({ documentId: response.data.id ?? "" });
            if (verifyDoc.data.body?.content) {
              const textContent = verifyDoc.data.body.content
                .map((element) => {
                  if (element.paragraph?.elements) {
                    return element.paragraph.elements
                      .map((elem) => (elem.textRun ? elem.textRun.content : ""))
                      .join("");
                  }
                  return "";
                })
                .join("")
                .trim();
              console.log(
                "Verified content length:",
                textContent.length,
                "First 50 chars:",
                textContent.substring(0, 50)
              );

              if (textContent.length === 0) {
                console.error(
                  "Content insertion failed - document is still empty. Full structure:",
                  JSON.stringify(verifyDoc.data.body, null, 2)
                );
                throw new Error("Content insertion failed - document is still empty after insertion");
              }
            } else {
              console.error("Could not verify content - document structure is missing");
            }
          } catch (error) {
            console.error("Error inserting text into Google Doc:", error);
            console.error(
              "Error details:",
              error instanceof Error ? error.message : String(error)
            );
            if (error instanceof Error && "response" in error) {
              const response = (error as { response?: { data?: unknown } }).response;
              console.error("Error response:", response?.data);
            }

            // Check if this is a scope/authentication issue
            const err = error as { status?: number; code?: number };
            if (err.status === 401 || err.code === 401) {
              // Check if tokens actually have the Docs scope before clearing
              const tokens = await getTokens(session.email);

              let hasDocsScope = false;
              if (tokens?.scope) {
                hasDocsScope =
                  Boolean(
                    tokens.scope.includes("documents") ||
                    tokens.scope.includes("https://www.googleapis.com/auth/documents")
                  );
                console.log("Checking token scope:", tokens.scope);
                console.log("Has Docs scope in stored tokens:", hasDocsScope);
              }

              // Only clear tokens if they don't have the Docs scope
              if (!hasDocsScope) {
                console.log("Tokens do not have Docs scope - clearing to force re-authorization");
                try {
                  const siteID = process.env.NETLIFY_SITE_ID ?? process.env.SITE_ID;
                  const token = process.env.NETLIFY_AUTH_TOKEN;

                  const storeOptions: { name: string; siteID?: string; token?: string } = {
                    name: "drive-tokens"
                  };
                  if (siteID) storeOptions.siteID = siteID;
                  if (token) storeOptions.token = token;

                  const store = getStore(storeOptions);
                  const data = await store.get(STORAGE_KEY);
                  if (data && typeof data === "string") {
                    const allTokens = JSON.parse(data) as Record<string, unknown>;
                    delete allTokens[session.email]; // Remove this user's tokens
                    await store.set(STORAGE_KEY, JSON.stringify(allTokens, null, 2));
                    console.log(
                      "Cleared tokens due to missing Docs API scope - user needs to re-authorize"
                    );
                  }
                } catch (clearError) {
                  console.error("Error clearing tokens:", clearError);
                }

                // Return a specific error that the frontend can handle
                return createErrorResponse(
                  403,
                  "MISSING_DOCS_SCOPE",
                  "OAuth tokens are missing Google Docs API scope. Please re-authorize Drive access to enable Google Docs creation."
                );
              } else {
                // Tokens have the scope, but still got 401 - this might be a different auth issue
                console.error(
                  "Got 401 error but tokens have Docs scope - might be expired or invalid token"
                );
                throw error; // Re-throw the original error
              }
            }

            // Re-throw other errors
            throw error;
          }
        }

        return createSuccessResponse({
          id: response.data.id ?? "",
          name: response.data.name ?? "",
          modifiedTime: response.data.modifiedTime ?? ""
        });
      } else {
        // Create regular file
        const fileMetadata: {
          name: string;
          mimeType: string;
          parents?: string[];
        } = {
          name: fileName,
          mimeType: mimeType
        };

        if (parentFolderId) {
          fileMetadata.parents = [parentFolderId];
        }

        const fileBuffer = Buffer.from(content, "utf8");
        const fileStream = Readable.from(fileBuffer);
        const response = await drive.files.create({
          requestBody: fileMetadata,
          media: {
            mimeType: mimeType,
            body: fileStream
          },
          fields: "id, name, modifiedTime"
        });

        return createSuccessResponse({
          id: response.data.id ?? "",
          name: response.data.name ?? "",
          modifiedTime: response.data.modifiedTime ?? ""
        });
      }
    }
  } catch (error) {
    console.error("Drive write error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to write file";

    // Check if it's a timeout error
    if (errorMessage.includes("timed out") || errorMessage.includes("timeout")) {
      return createErrorResponse(504, "Request timed out. Please try again.");
    }

    return createErrorResponse(500, errorMessage);
  }
};

