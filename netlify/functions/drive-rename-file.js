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
            return (0, types_1.createErrorResponse)(400, "fileId and fileName required");
        }
        const { fileId, fileName } = JSON.parse(event.body);
        if (!fileId || !fileName) {
            return (0, types_1.createErrorResponse)(400, "fileId and fileName required");
        }
        const drive = await (0, drive_client_1.getAuthenticatedDriveClient)(session.email);
        // Update file name
        await drive.files.update({
            fileId: fileId,
            requestBody: {
                name: fileName
            }
        });
        return (0, types_1.createSuccessResponse)({
            id: fileId,
            name: fileName
        });
    }
    catch (error) {
        console.error("Drive rename file error:", error);
        return (0, types_1.createErrorResponse)(500, error instanceof Error ? error.message : "Failed to rename file");
    }
};
exports.handler = handler;
