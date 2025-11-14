import { apiClient } from "../../api/client";
import { normalizePlainText } from "../../editor/textExtraction";

/**
 * JSON file structure for snippet content storage
 */
export interface SnippetJsonData {
  content: string;
  modifiedTime: string;
  version: number;
  gdocFileId?: string;
  gdocModifiedTime?: string;
}

/**
 * Get the filename for a snippet's JSON file
 * Format: .{snippetId}.yarny.json
 */
export function getSnippetJsonFileName(snippetId: string): string {
  return `.${snippetId}.yarny.json`;
}

/**
 * Find a snippet's JSON file in a folder
 * Returns the file ID if found, undefined otherwise
 */
export async function findSnippetJsonFile(
  snippetId: string,
  parentFolderId: string
): Promise<string | undefined> {
  const fileName = getSnippetJsonFileName(snippetId);
  const files = await apiClient.listDriveFiles({ folderId: parentFolderId });
  
  const jsonFile = files.files?.find(
    (file) => file.name === fileName && !file.trashed
  );
  
  return jsonFile?.id;
}

/**
 * Read snippet content from JSON file
 */
export async function readSnippetJson(
  snippetId: string,
  parentFolderId: string
): Promise<SnippetJsonData | null> {
  try {
    const fileId = await findSnippetJsonFile(snippetId, parentFolderId);
    if (!fileId) {
      return null;
    }

    const response = await apiClient.readDriveFile({ fileId });
    if (!response.content) {
      return null;
    }

    const parsed = JSON.parse(response.content) as SnippetJsonData;
    
    // Validate structure
    if (typeof parsed.content !== "string" || typeof parsed.modifiedTime !== "string") {
      console.warn(`Invalid JSON structure for snippet ${snippetId}`);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error(`Failed to read JSON file for snippet ${snippetId}:`, error);
    return null;
  }
}

/**
 * Write snippet content to JSON file
 */
export async function writeSnippetJson(
  snippetId: string,
  content: string,
  parentFolderId: string,
  gdocFileId?: string,
  gdocModifiedTime?: string
): Promise<{ fileId: string; modifiedTime: string }> {
  const fileName = getSnippetJsonFileName(snippetId);
  const normalizedContent = normalizePlainText(content);
  
  const jsonData: SnippetJsonData = {
    content: normalizedContent,
    modifiedTime: new Date().toISOString(),
    version: 1,
    gdocFileId,
    gdocModifiedTime
  };

  // Check if file already exists
  const existingFileId = await findSnippetJsonFile(snippetId, parentFolderId);
  
  const response = await apiClient.writeDriveFile({
    fileId: existingFileId,
    fileName,
    content: JSON.stringify(jsonData, null, 2),
    parentFolderId,
    mimeType: "application/json"
  });

  return {
    fileId: response.id,
    modifiedTime: response.modifiedTime
  };
}

/**
 * Compare content between JSON and Google Doc
 * Returns true if content differs (after normalization)
 */
export function compareContent(jsonContent: string, gdocContent: string): boolean {
  const normalizedJson = normalizePlainText(jsonContent);
  const normalizedGdoc = normalizePlainText(gdocContent);
  return normalizedJson !== normalizedGdoc;
}

