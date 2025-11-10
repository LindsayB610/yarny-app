import { z } from "zod";

// ============================================================================
// Authentication API Contracts
// ============================================================================

export const LocalBypassConfigSchema = z.object({
  enabled: z.boolean(),
  email: z.string().optional(),
  name: z.string().optional(),
  picture: z.string().optional()
});

export const ConfigResponseSchema = z.object({
  clientId: z.string(),
  localBypass: LocalBypassConfigSchema.optional()
});

export type ConfigResponse = z.infer<typeof ConfigResponseSchema>;

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

export const VerifyGoogleResponseSchema = z.object({
  verified: z.boolean(),
  user: z.string(),
  name: z.string().optional(),
  picture: z.string().optional(),
  token: z.string()
});

export type VerifyGoogleResponse = z.infer<typeof VerifyGoogleResponseSchema>;

export const LogoutResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});

export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

// ============================================================================
// Drive API Contracts
// ============================================================================

export const DriveFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  modifiedTime: z.string().optional(),
  size: z.string().optional(),
  trashed: z.boolean().optional()
});

export type DriveFile = z.infer<typeof DriveFileSchema>;

export const DriveListResponseSchema = z.object({
  files: z.array(DriveFileSchema).optional(),
  nextPageToken: z.string().optional()
});

export type DriveListResponse = z.infer<typeof DriveListResponseSchema>;

export const DriveListQueryParamsSchema = z.object({
  folderId: z.string().optional(),
  pageToken: z.string().optional()
});

export type DriveListQueryParams = z.infer<typeof DriveListQueryParamsSchema>;

export const DriveReadRequestSchema = z.object({
  fileId: z.string()
});

export type DriveReadRequest = z.infer<typeof DriveReadRequestSchema>;

export const DriveReadResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  modifiedTime: z.string().optional(),
  mimeType: z.string().optional()
});

export type DriveReadResponse = z.infer<typeof DriveReadResponseSchema>;

export const DriveWriteRequestSchema = z.object({
  fileId: z.string().optional(),
  fileName: z.string(),
  content: z.string(),
  parentFolderId: z.string().optional(),
  mimeType: z.string().optional()
});

export type DriveWriteRequest = z.infer<typeof DriveWriteRequestSchema>;

export const DriveWriteResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  modifiedTime: z.string()
});

export type DriveWriteResponse = z.infer<typeof DriveWriteResponseSchema>;

export const DriveCreateFolderRequestSchema = z.object({
  name: z.string(),
  parentFolderId: z.string().optional()
});

export type DriveCreateFolderRequest = z.infer<typeof DriveCreateFolderRequestSchema>;

export const DriveCreateFolderResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  created: z.boolean()
});

export type DriveCreateFolderResponse = z.infer<typeof DriveCreateFolderResponseSchema>;

export const DriveGetOrCreateYarnyStoriesResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  created: z.boolean(),
  migrated: z.boolean().optional()
});

export type DriveGetOrCreateYarnyStoriesResponse = z.infer<
  typeof DriveGetOrCreateYarnyStoriesResponseSchema
>;

export const DriveDeleteFileRequestSchema = z.object({
  fileId: z.string()
});

export type DriveDeleteFileRequest = z.infer<typeof DriveDeleteFileRequestSchema>;

export const DriveDeleteFileResponseSchema = z.object({
  success: z.boolean()
});

export type DriveDeleteFileResponse = z.infer<typeof DriveDeleteFileResponseSchema>;

export const DriveRenameFileRequestSchema = z.object({
  fileId: z.string(),
  newName: z.string()
});

export type DriveRenameFileRequest = z.infer<typeof DriveRenameFileRequestSchema>;

export const DriveRenameFileResponseSchema = z.object({
  id: z.string(),
  name: z.string()
});

export type DriveRenameFileResponse = z.infer<typeof DriveRenameFileResponseSchema>;

export const DriveCheckCommentsRequestSchema = z.object({
  fileId: z.string()
});

export type DriveCheckCommentsRequest = z.infer<typeof DriveCheckCommentsRequestSchema>;

export const DriveCheckCommentsResponseSchema = z.object({
  hasComments: z.boolean(),
  hasTrackedChanges: z.boolean(),
  commentCount: z.number().optional(),
  commentIds: z.array(z.string()).optional()
});

export type DriveCheckCommentsResponse = z.infer<typeof DriveCheckCommentsResponseSchema>;

export const DriveDeleteStoryRequestSchema = z.object({
  storyFolderId: z.string(),
  deleteFromDrive: z.boolean().optional()
});

export type DriveDeleteStoryRequest = z.infer<typeof DriveDeleteStoryRequestSchema>;

export const DriveDeleteStoryResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedFromDrive: z.boolean().optional()
});

export type DriveDeleteStoryResponse = z.infer<typeof DriveDeleteStoryResponseSchema>;

// ============================================================================
// Error Response Schema
// ============================================================================

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  requiresReauth: z.boolean().optional(),
  fileId: z.string().optional()
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============================================================================
// Helper function to parse API responses with error handling
// ============================================================================

export function parseApiResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("API response validation error:", error.errors);
      throw new Error(
        `Invalid API response: ${error.errors.map((e) => e.message).join(", ")}`
      );
    }
    throw error;
  }
}

