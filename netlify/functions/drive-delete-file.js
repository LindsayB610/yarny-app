"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const contract_1 = require("./contract");
const drive_client_1 = require("./drive-client");
const types_1 = require("./types");
const handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return (0, types_1.createErrorResponse)(405, "Method not allowed");
    }
    const session = (0, types_1.parseSessionFromEvent)(event);
    if (!session) {
        return (0, types_1.createErrorResponse)(401, "Not authenticated");
    }
    try {
        // Validate request body with Zod schema
        let fileId;
        try {
            const validated = (0, contract_1.validateRequest)(contract_1.DriveDeleteFileRequestSchema, event.body, "fileId required");
            fileId = validated.fileId;
        }
        catch (validationError) {
            return (0, types_1.createErrorResponse)(400, validationError instanceof Error ? validationError.message : "fileId required");
        }
        const drive = await (0, drive_client_1.getAuthenticatedDriveClient)(session.email);
        // Move file to trash (soft delete - can be recovered)
        await drive.files.update({
            fileId: fileId,
            requestBody: {
                trashed: true
            }
        });
        return (0, types_1.createSuccessResponse)({
            success: true,
            message: "File moved to trash"
        });
    }
    catch (error) {
        console.error("Drive delete file error:", error);
        return (0, types_1.createErrorResponse)(500, error instanceof Error ? error.message : "Failed to delete file");
    }
};
exports.handler = handler;
