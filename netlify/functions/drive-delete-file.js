"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const types_1 = require("./types");
const drive_client_1 = require("./drive-client");
const handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return (0, types_1.createErrorResponse)(405, "Method not allowed");
    }
    const session = (0, types_1.parseSessionFromEvent)(event);
    if (!session) {
        return (0, types_1.createErrorResponse)(401, "Not authenticated");
    }
    try {
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, "fileId required");
        }
        const { fileId } = JSON.parse(event.body);
        if (!fileId) {
            return (0, types_1.createErrorResponse)(400, "fileId required");
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
