"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const types_1 = require("./types");
const handler = async (_event) => {
    const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
    if (!clientId) {
        console.error("GOOGLE_CLIENT_ID environment variable is missing or empty");
        return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(500, "Google Client ID not configured"));
    }
    // Log length and first few characters for debugging (don't log full ID for security)
    console.log("Serving Client ID (length:", clientId.length + ", prefix:", clientId.substring(0, 20) + "...)");
    const localBypassSecret = (process.env.LOCAL_DEV_BYPASS_SECRET || "").trim();
    const localBypassEnabled = Boolean(localBypassSecret);
    const localBypass = localBypassEnabled
        ? {
            enabled: true,
            email: (process.env.LOCAL_DEV_BYPASS_EMAIL || "").trim(),
            name: (process.env.LOCAL_DEV_BYPASS_NAME || "").trim(),
            picture: (process.env.LOCAL_DEV_BYPASS_PICTURE || "").trim() || undefined
        }
        : { enabled: false };
    return (0, types_1.addCorsHeaders)((0, types_1.createSuccessResponse)({ clientId, localBypass }));
};
exports.handler = handler;
