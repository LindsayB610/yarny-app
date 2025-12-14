/**
 * Shared API contract schemas for Netlify Functions
 * These schemas match src/api/contract.ts and are used for runtime validation
 * of incoming requests in serverless functions.
 */

import { z } from "zod";

// ============================================================================
// Authentication API Contracts
// ============================================================================

export const VerifyGoogleRequestSchema = z.union([
  z.object({
    token: z.string()
  }),
  z.object({
    mode: z.literal("local-bypass"),
    secret: z.string()
  })
]);

export type VerifyGoogleRequest = z.infer<typeof VerifyGoogleRequestSchema>;

// ============================================================================
// Drive API Contracts
// ============================================================================

export const DriveReadRequestSchema = z.object({
  fileId: z.string()
});

export type DriveReadRequest = z.infer<typeof DriveReadRequestSchema>;

export const DriveWriteRequestSchema = z.object({
  fileId: z.string().optional(),
  fileName: z.string(),
  content: z.string(),
  parentFolderId: z.string().optional(),
  mimeType: z.string().optional()
});

export type DriveWriteRequest = z.infer<typeof DriveWriteRequestSchema>;

// Note: drive-create-folder uses 'folderName' but schema expects 'name'
// We'll create a schema that accepts both for backward compatibility
export const DriveCreateFolderRequestSchema = z.object({
  name: z.string().optional(),
  folderName: z.string().optional(), // Legacy field name
  parentFolderId: z.string().optional()
}).refine(
  (data) => data.name !== undefined || data.folderName !== undefined,
  { message: "Either 'name' or 'folderName' is required" }
).transform((data) => ({
  name: data.name ?? data.folderName ?? "",
  parentFolderId: data.parentFolderId
})) as z.ZodType<
  { name: string; parentFolderId?: string },
  z.ZodTypeDef,
  { name?: string; folderName?: string; parentFolderId?: string }
>;

export type DriveCreateFolderRequest = { name: string; parentFolderId?: string };

export const DriveDeleteFileRequestSchema = z.object({
  fileId: z.string()
});

export type DriveDeleteFileRequest = z.infer<typeof DriveDeleteFileRequestSchema>;

// Note: drive-rename-file uses 'fileName' but schema expects 'newName'
// We'll create a schema that accepts both for backward compatibility
export const DriveRenameFileRequestSchema = z.object({
  fileId: z.string(),
  newName: z.string().optional(), // Schema field name
  fileName: z.string().optional() // Legacy field name
}).refine(
  (data) => data.newName !== undefined || data.fileName !== undefined,
  { message: "Either 'newName' or 'fileName' is required" }
).transform((data) => ({
  fileId: data.fileId,
  newName: data.newName ?? data.fileName ?? ""
})) as z.ZodType<
  { fileId: string; newName: string },
  z.ZodTypeDef,
  { fileId: string; newName?: string; fileName?: string }
>;

export type DriveRenameFileRequest = { fileId: string; newName: string };

export const DriveCheckCommentsRequestSchema = z.object({
  fileId: z.string()
});

export type DriveCheckCommentsRequest = z.infer<typeof DriveCheckCommentsRequestSchema>;

export const DriveDeleteStoryRequestSchema = z.object({
  storyFolderId: z.string(),
  deleteFromDrive: z.boolean().optional()
});

export type DriveDeleteStoryRequest = z.infer<typeof DriveDeleteStoryRequestSchema>;

export const DriveListQueryParamsSchema = z.object({
  folderId: z.string().optional(),
  pageToken: z.string().optional()
});

export type DriveListQueryParams = z.infer<typeof DriveListQueryParamsSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Helper function to validate request bodies with Zod schemas
 * Supports both regular schemas and transformed schemas (with different input/output types)
 */
export function validateRequest<TInput, TOutput = TInput>(
  schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>,
  body: string | null,
  errorMessage = "Invalid request"
): TOutput {
  if (!body) {
    throw new Error(`${errorMessage}: Request body is required`);
  }

  try {
    const parsed = JSON.parse(body);
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      throw new Error(`${errorMessage}: ${errorDetails}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`${errorMessage}: Invalid JSON`);
    }
    throw error;
  }
}

/**
 * Helper function to validate query parameters with Zod schemas
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  params: Record<string, string> | null,
  errorMessage = "Invalid query parameters"
): T {
  try {
    return schema.parse(params ?? {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      throw new Error(`${errorMessage}: ${errorDetails}`);
    }
    throw error;
  }
}

