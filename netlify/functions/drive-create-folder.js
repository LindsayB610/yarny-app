"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const types_1 = require("./types");
const drive_client_1 = require("./drive-client");
// Helper to add timeout to promises
function withTimeout(promise, timeoutMs, errorMessage) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage || "Operation timed out")), timeoutMs))
    ]);
}
const handler = async (event, context) => {
    // Set function timeout to use as much time as available
    context.callbackWaitsForEmptyEventLoop = false;
    if (event.httpMethod !== "POST") {
        return (0, types_1.createErrorResponse)(405, "Method not allowed");
    }
    const session = (0, types_1.parseSessionFromEvent)(event);
    if (!session) {
        return (0, types_1.createErrorResponse)(401, "Not authenticated");
    }
    try {
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, "folderName required");
        }
        const { folderName, parentFolderId } = JSON.parse(event.body);
        if (!folderName) {
            return (0, types_1.createErrorResponse)(400, "folderName required");
        }
        console.log("Creating folder:", folderName, "parentFolderId:", parentFolderId);
        // Get authenticated drive client with timeout (max 8 seconds to leave buffer for response)
        const drive = await withTimeout((0, drive_client_1.getAuthenticatedDriveClient)(session.email), 8000, "Drive client authentication timed out");
        // Check if folder already exists (with timeout)
        const escapedFolderName = folderName.replace(/'/g, "\\'");
        const query = parentFolderId
            ? `name='${escapedFolderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
            : `name='${escapedFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        console.log("Checking for existing folder...");
        const existingFolders = await withTimeout(drive.files.list({
            q: query,
            fields: "files(id, name)"
        }), 8000, "Folder check timed out");
        if (existingFolders.data.files && existingFolders.data.files.length > 0) {
            // Folder already exists, return it
            const existingFolder = existingFolders.data.files?.[0];
            if (existingFolder?.id) {
                console.log("Folder already exists:", existingFolder.id);
                return (0, types_1.createSuccessResponse)({
                    id: existingFolder.id,
                    name: existingFolder.name || folderName,
                    created: false
                });
            }
        }
        // Create new folder (with timeout)
        console.log("Creating new folder...");
        const folderMetadata = {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder"
        };
        if (parentFolderId) {
            folderMetadata.parents = [parentFolderId];
        }
        const response = await withTimeout(drive.files.create({
            requestBody: folderMetadata,
            fields: "id, name, createdTime"
        }), 8000, "Folder creation timed out");
        console.log("Folder created successfully:", response.data.id);
        return (0, types_1.createSuccessResponse)({
            id: response.data.id || "",
            name: response.data.name || folderName,
            created: true
        });
    }
    catch (error) {
        console.error("Drive create folder error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to create folder";
        // Check if it's a timeout error
        if (errorMessage.includes("timed out") || errorMessage.includes("timeout")) {
            return (0, types_1.createErrorResponse)(504, "Request timed out. Please try again.");
        }
        return (0, types_1.createErrorResponse)(500, errorMessage);
    }
};
exports.handler = handler;
