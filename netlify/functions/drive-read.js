"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const googleapis_1 = require("googleapis");
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
            const validated = (0, contract_1.validateRequest)(contract_1.DriveReadRequestSchema, event.body, "fileId required");
            fileId = validated.fileId;
        }
        catch (validationError) {
            return (0, types_1.createErrorResponse)(400, validationError instanceof Error ? validationError.message : "fileId required");
        }
        const drive = await (0, drive_client_1.getAuthenticatedDriveClient)(session.email);
        // Get file metadata first
        const fileMetadata = await drive.files.get({
            fileId: fileId,
            fields: "id, name, mimeType, modifiedTime"
        });
        let content = "";
        // Handle Google Docs differently
        if (fileMetadata.data.mimeType === "application/vnd.google-apps.document") {
            // Export Google Doc as plain text
            const auth = (drive)._auth;
            if (!auth) {
                throw new Error("Drive client auth not available");
            }
            const docs = googleapis_1.google.docs({ version: "v1", auth });
            const doc = await docs.documents.get({
                documentId: fileId
            });
            // Extract text from document
            if (doc.data.body?.content) {
                content = doc.data.body.content
                    .map((element) => {
                    if (element.paragraph?.elements) {
                        return element.paragraph.elements
                            .map((elem) => (elem.textRun ? elem.textRun.content : ""))
                            .join("");
                    }
                    return "";
                })
                    .join("\n")
                    .trim();
            }
        }
        else {
            // Download regular file content
            const fileContent = await drive.files.get({ fileId: fileId, alt: "media" }, { responseType: "arraybuffer" });
            // Convert buffer to string (assuming text files)
            if (fileContent.data instanceof ArrayBuffer) {
                content = Buffer.from(fileContent.data).toString("utf8");
            }
            else if (typeof fileContent.data === "string") {
                content = fileContent.data;
            }
        }
        return (0, types_1.createSuccessResponse)({
            id: fileMetadata.data.id || "",
            name: fileMetadata.data.name || "",
            mimeType: fileMetadata.data.mimeType || "",
            modifiedTime: fileMetadata.data.modifiedTime || "",
            content: content
        });
    }
    catch (error) {
        console.error("Drive read error:", error);
        return (0, types_1.createErrorResponse)(500, error instanceof Error ? error.message : "Failed to read file");
    }
};
exports.handler = handler;
