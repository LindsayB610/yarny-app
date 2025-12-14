import { google } from "googleapis";

import {
  DriveCheckCommentsRequestSchema,
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
        DriveCheckCommentsRequestSchema,
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
      fields: "id, name, mimeType"
    });

    // Only check Google Docs
    if (fileMetadata.data.mimeType !== "application/vnd.google-apps.document") {
      return createSuccessResponse({
        hasComments: false,
        hasTrackedChanges: false,
        commentCount: 0
      });
    }

    const auth = (drive)._auth;
    if (!auth) {
      throw new Error("Drive client auth not available");
    }

    const docs = google.docs({ version: "v1", auth });

    // Get document with comments and suggestions
    const doc = await docs.documents.get({
      documentId: fileId,
      suggestionsViewMode: "PREVIEW_WITH_SUGGESTIONS" // This shows suggestions in the document
    });

    // Check for comments using the Drive API (already authenticated)
    let commentCount = 0;
    let hasComments = false;
    const commentIds: string[] = [];

    try {
      // Get comments for the file using Drive API v3
      const commentsResponse = await drive.comments.list({
        fileId: fileId,
        fields: "comments(id,content,author,createdTime)",
        pageSize: 100
      });

      if (commentsResponse.data.comments && commentsResponse.data.comments.length > 0) {
        commentCount = commentsResponse.data.comments.length;
        hasComments = true;
        commentIds.push(
          ...commentsResponse.data.comments.map((c) => c.id ?? "").filter(Boolean)
        );
      }
    } catch (commentError) {
      // If comments API fails, we'll still check for suggestions
      console.warn(
        "Could not fetch comments:",
        commentError instanceof Error ? commentError.message : String(commentError)
      );
    }

    // Check for tracked changes (suggestions)
    // Suggestions appear in the document structure when suggestionsViewMode is set
    let hasTrackedChanges = false;

    if (doc.data.body?.content) {
      // Walk through document content to find suggestions
      const hasSuggestions = doc.data.body.content.some((element) => {
        if (element.paragraph?.elements) {
          return element.paragraph.elements.some((elem) => {
            // Check for text runs with suggestions
            if (
              elem.textRun?.suggestedInsertionIds &&
              elem.textRun.suggestedInsertionIds.length > 0
            ) {
              return true;
            }
            if (
              elem.textRun?.suggestedDeletionIds &&
              elem.textRun.suggestedDeletionIds.length > 0
            ) {
              return true;
            }
            return false;
          });
        }
        // Check table cells for suggestions
        if (element.table?.tableRows) {
          return element.table.tableRows.some((row) =>
            row.tableCells?.some((cell) =>
              cell.content?.some((contentElem) => {
                if (contentElem.paragraph?.elements) {
                  return contentElem.paragraph.elements.some((elem) => {
                    if (
                      elem.textRun &&
                      (() => {
                        const hasInsertions = Boolean(
                          elem.textRun.suggestedInsertionIds && elem.textRun.suggestedInsertionIds.length > 0
                        );
                        const hasDeletions = Boolean(
                          elem.textRun.suggestedDeletionIds && elem.textRun.suggestedDeletionIds.length > 0
                        );
                        return Boolean(hasInsertions || hasDeletions);
                      })()
                    ) {
                      return true;
                    }
                    return false;
                  });
                }
                return false;
              })
            )
          );
        }
        return false;
      });

      hasTrackedChanges = hasSuggestions;
    }

    // Also check for revisions (tracked changes history)
    let hasRevisions = false;
    try {
      const revisionsResponse = await drive.revisions.list({
        fileId: fileId,
        fields: "revisions(id,modifiedTime,keepForever)",
        pageSize: 10
      });

      // If there are multiple revisions (more than just the initial one), there might be tracked changes
      if (revisionsResponse.data.revisions && revisionsResponse.data.revisions.length > 1) {
        // Check if any revisions indicate suggestions
        hasRevisions = true;
      }
    } catch (revisionError) {
      // Revisions check is optional
      console.warn(
        "Could not fetch revisions:",
        revisionError instanceof Error
          ? revisionError.message
          : String(revisionError)
      );
    }

    // Consider tracked changes if we found suggestions or if there are multiple revisions
    // (though multiple revisions alone don't guarantee tracked changes, it's a good indicator)
    const hasTrackedChangesFinal = Boolean(hasTrackedChanges || (hasRevisions && hasComments));

    return createSuccessResponse({
      hasComments: hasComments,
      hasTrackedChanges: hasTrackedChangesFinal,
      commentCount: commentCount,
      commentIds: commentIds.length > 0 ? commentIds : undefined
    });
  } catch (error) {
    console.error("Drive check comments error:", error);
    // If checking fails, return safe defaults (assume no comments/changes to avoid blocking saves)
    return createSuccessResponse({
      hasComments: false,
      hasTrackedChanges: false,
      commentCount: 0,
      error:
        "Could not check for comments/changes: " +
        (error instanceof Error ? error.message : String(error))
    });
  }
};

