"use strict";
/**
 * Shared API contract schemas for Netlify Functions
 * These schemas match src/api/contract.ts and are used for runtime validation
 * of incoming requests in serverless functions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriveListQueryParamsSchema = exports.DriveDeleteStoryRequestSchema = exports.DriveCheckCommentsRequestSchema = exports.DriveRenameFileRequestSchema = exports.DriveDeleteFileRequestSchema = exports.DriveCreateFolderRequestSchema = exports.DriveWriteRequestSchema = exports.DriveReadRequestSchema = exports.VerifyGoogleRequestSchema = void 0;
exports.validateRequest = validateRequest;
exports.validateQueryParams = validateQueryParams;
const zod_1 = require("zod");
// ============================================================================
// Authentication API Contracts
// ============================================================================
exports.VerifyGoogleRequestSchema = zod_1.z.object({
    token: zod_1.z.string()
});
// ============================================================================
// Drive API Contracts
// ============================================================================
exports.DriveReadRequestSchema = zod_1.z.object({
    fileId: zod_1.z.string()
});
exports.DriveWriteRequestSchema = zod_1.z.object({
    fileId: zod_1.z.string().optional(),
    fileName: zod_1.z.string(),
    content: zod_1.z.string(),
    parentFolderId: zod_1.z.string().optional(),
    mimeType: zod_1.z.string().optional()
});
// Note: drive-create-folder uses 'folderName' but schema expects 'name'
// We'll create a schema that accepts both for backward compatibility
exports.DriveCreateFolderRequestSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    folderName: zod_1.z.string().optional(), // Legacy field name
    parentFolderId: zod_1.z.string().optional()
}).refine((data) => data.name !== undefined || data.folderName !== undefined, { message: "Either 'name' or 'folderName' is required" }).transform((data) => ({
    name: data.name || data.folderName || "",
    parentFolderId: data.parentFolderId
}));
exports.DriveDeleteFileRequestSchema = zod_1.z.object({
    fileId: zod_1.z.string()
});
// Note: drive-rename-file uses 'fileName' but schema expects 'newName'
// We'll create a schema that accepts both for backward compatibility
exports.DriveRenameFileRequestSchema = zod_1.z.object({
    fileId: zod_1.z.string(),
    newName: zod_1.z.string().optional(), // Schema field name
    fileName: zod_1.z.string().optional() // Legacy field name
}).refine((data) => data.newName !== undefined || data.fileName !== undefined, { message: "Either 'newName' or 'fileName' is required" }).transform((data) => ({
    fileId: data.fileId,
    newName: data.newName || data.fileName || ""
}));
exports.DriveCheckCommentsRequestSchema = zod_1.z.object({
    fileId: zod_1.z.string()
});
exports.DriveDeleteStoryRequestSchema = zod_1.z.object({
    storyFolderId: zod_1.z.string(),
    deleteFromDrive: zod_1.z.boolean().optional()
});
exports.DriveListQueryParamsSchema = zod_1.z.object({
    folderId: zod_1.z.string().optional(),
    pageToken: zod_1.z.string().optional()
});
// ============================================================================
// Validation Helpers
// ============================================================================
/**
 * Helper function to validate request bodies with Zod schemas
 * Supports both regular schemas and transformed schemas (with different input/output types)
 */
function validateRequest(schema, body, errorMessage = "Invalid request") {
    if (!body) {
        throw new Error(`${errorMessage}: Request body is required`);
    }
    try {
        const parsed = JSON.parse(body);
        return schema.parse(parsed);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
function validateQueryParams(schema, params, errorMessage = "Invalid query parameters") {
    try {
        return schema.parse(params || {});
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errorDetails = error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join(", ");
            throw new Error(`${errorMessage}: ${errorDetails}`);
        }
        throw error;
    }
}
