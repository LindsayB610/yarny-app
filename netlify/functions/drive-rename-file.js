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
        // Schema handles both 'newName' and 'fileName' for backward compatibility
        let fileId;
        let newName;
        try {
            const validated = (0, contract_1.validateRequest)(contract_1.DriveRenameFileRequestSchema, event.body, "fileId and fileName (or newName) required");
            fileId = validated.fileId;
            newName = validated.newName;
        }
        catch (validationError) {
            return (0, types_1.createErrorResponse)(400, validationError instanceof Error ? validationError.message : "fileId and fileName (or newName) required");
        }
        const drive = await (0, drive_client_1.getAuthenticatedDriveClient)(session.email);
        // Update file name
        await drive.files.update({
            fileId: fileId,
            requestBody: {
                name: newName
            }
        });
        return (0, types_1.createSuccessResponse)({
            id: fileId,
            name: newName
        });
    }
    catch (error) {
        console.error("Drive rename file error:", error);
        return (0, types_1.createErrorResponse)(500, error instanceof Error ? error.message : "Failed to rename file");
    }
};
exports.handler = handler;
