"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const contract_1 = require("./contract");
const drive_client_1 = require("./drive-client");
const types_1 = require("./types");
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
        // Validate query parameters with Zod schema
        let folderId;
        let pageToken;
        try {
            const validated = (0, contract_1.validateQueryParams)(contract_1.DriveListQueryParamsSchema, event.queryStringParameters, "Invalid query parameters");
            folderId = validated.folderId;
            pageToken = validated.pageToken;
        }
        catch (validationError) {
            return (0, types_1.createErrorResponse)(400, validationError instanceof Error ? validationError.message : "Invalid query parameters");
        }
        const query = folderId
            ? `'${folderId}' in parents and trashed=false`
            : "trashed=false";
        const listParams = {
            q: query,
            fields: "nextPageToken, files(id, name, mimeType, modifiedTime, size, trashed)",
            pageSize: 100,
            orderBy: "modifiedTime desc"
        };
        if (pageToken) {
            listParams.pageToken = pageToken;
        }
        const response = await drive.files.list(listParams);
        if (!response.data) {
            throw new Error("Drive API returned no data");
        }
        return (0, types_1.createSuccessResponse)(response.data);
    }
    catch (error) {
        console.error("Drive list error:", error);
        return (0, types_1.createErrorResponse)(500, error instanceof Error ? error.message : "Failed to list files");
    }
};
exports.handler = handler;
