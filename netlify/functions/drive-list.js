"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const types_1 = require("./types");
const drive_client_1 = require("./drive-client");
const handler = async (event) => {
    if (event.httpMethod !== "GET") {
        return (0, types_1.createErrorResponse)(405, "Method not allowed");
    }
    const session = (0, types_1.parseSessionFromEvent)(event);
    if (!session) {
        return (0, types_1.createErrorResponse)(401, "Not authenticated");
    }
    console.log("Drive list - looking for tokens for email:", session.email);
    try {
        const drive = await (0, drive_client_1.getAuthenticatedDriveClient)(session.email);
        const { folderId, pageToken } = event.queryStringParameters || {};
        const query = folderId
            ? `'${folderId}' in parents and trashed=false`
            : "trashed=false";
        const response = await drive.files.list({
            q: query,
            fields: "nextPageToken, files(id, name, mimeType, modifiedTime, size, trashed)",
            pageSize: 100,
            pageToken: pageToken || undefined,
            orderBy: "modifiedTime desc"
        });
        return (0, types_1.createSuccessResponse)(response.data);
    }
    catch (error) {
        console.error("Drive list error:", error);
        return (0, types_1.createErrorResponse)(500, error instanceof Error ? error.message : "Failed to list files");
    }
};
exports.handler = handler;
