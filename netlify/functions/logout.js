"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const types_1 = require("./types");
const handler = async (event) => {
    if (event.httpMethod !== "POST" && event.httpMethod !== "GET") {
        return (0, types_1.createSuccessResponse)({ error: "Method not allowed" }, 405);
    }
    // Clear session and auth cookies by setting them to expire immediately
    const clearSessionCookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; HttpOnly; Secure; SameSite=Strict";
    const clearAuthCookie = "auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure; SameSite=Strict";
    const clearDriveAuthCookie = "drive_auth_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure; SameSite=Strict";
    return {
        statusCode: 200,
        multiValueHeaders: {
            "Set-Cookie": [clearSessionCookie, clearAuthCookie, clearDriveAuthCookie]
        },
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            success: true,
            message: "Logged out successfully"
        })
    };
};
exports.handler = handler;
