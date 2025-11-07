"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const types_1 = require("./types");
const drive_client_1 = require("./drive-client");
const handler = async (event) => {
    if (event.httpMethod !== "POST" && event.httpMethod !== "DELETE") {
        return (0, types_1.createErrorResponse)(405, "Method not allowed");
    }
    const session = (0, types_1.parseSessionFromEvent)(event);
    if (!session) {
        return (0, types_1.createErrorResponse)(401, "Not authenticated");
    }
    try {
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, "storyFolderId required");
        }
        const { storyFolderId, deleteFromDrive } = JSON.parse(event.body);
        if (!storyFolderId) {
            return (0, types_1.createErrorResponse)(400, "storyFolderId required");
        }
        const drive = await (0, drive_client_1.getAuthenticatedDriveClient)(session.email);
        if (deleteFromDrive) {
            // Permanently delete the folder from Google Drive
            await drive.files.delete({
                fileId: storyFolderId
            });
            return (0, types_1.createSuccessResponse)({
                success: true,
                message: "Story deleted from Google Drive",
                deletedFromDrive: true
            });
        }
        else {
            // Just trash the folder (soft delete - can be recovered)
            await drive.files.update({
                fileId: storyFolderId,
                requestBody: {
                    trashed: true
                }
            });
            return (0, types_1.createSuccessResponse)({
                success: true,
                message: "Story moved to trash",
                deletedFromDrive: false
            });
        }
    }
    catch (error) {
        console.error("Drive delete story error:", error);
        return (0, types_1.createErrorResponse)(500, error instanceof Error ? error.message : "Failed to delete story");
    }
};
exports.handler = handler;
