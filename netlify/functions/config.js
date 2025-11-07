"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const types_1 = require("./types");
const handler = async (event) => {
    const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
    if (!clientId) {
        console.error("GOOGLE_CLIENT_ID environment variable is missing or empty");
        return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(500, "Google Client ID not configured"));
    }
    // Log length and first few characters for debugging (don't log full ID for security)
    console.log("Serving Client ID (length:", clientId.length + ", prefix:", clientId.substring(0, 20) + "...)");
    return (0, types_1.addCorsHeaders)((0, types_1.createSuccessResponse)({ clientId }));
};
exports.handler = handler;
