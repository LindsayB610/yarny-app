"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const google_auth_library_1 = require("google-auth-library");
const contract_1 = require("./contract");
const types_1 = require("./types");
const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL || "lindsayb82@gmail.com";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const LOCAL_BYPASS_SECRET = (process.env.LOCAL_DEV_BYPASS_SECRET || "").trim();
const LOCAL_BYPASS_EMAIL = (process.env.LOCAL_DEV_BYPASS_EMAIL || "").trim();
const LOCAL_BYPASS_NAME = (process.env.LOCAL_DEV_BYPASS_NAME || "").trim();
const LOCAL_BYPASS_PICTURE = (process.env.LOCAL_DEV_BYPASS_PICTURE || "").trim();
const LOCAL_HOST_PATTERN = /(localhost|127\.0\.0\.1|::1)(:\d+)?(\/|$)/i;
function isLocalRequest(event) {
    const headersToCheck = [
        event.headers.origin,
        event.headers.referer,
        event.headers.host,
        event.headers["x-forwarded-host"],
        event.headers["x-forwarded-for"]
    ];
    return headersToCheck
        .filter(Boolean)
        .some((value) => LOCAL_HOST_PATTERN.test(String(value)));
}
const handler = async (event) => {
    // Handle preflight OPTIONS request for CORS
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "86400"
            },
            body: ""
        };
    }
    if (event.httpMethod !== "POST") {
        return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(405, "Method not allowed"));
    }
    try {
        let validatedRequest;
        try {
            validatedRequest = (0, contract_1.validateRequest)(contract_1.VerifyGoogleRequestSchema, event.body, "Token required");
        }
        catch (validationError) {
            return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(400, validationError instanceof Error
                ? validationError.message
                : "Token required"));
        }
        const allowedEmails = ALLOWED_EMAIL.split(",").map((e) => e.trim().toLowerCase());
        if (typeof validatedRequest === "object" &&
            "mode" in validatedRequest &&
            validatedRequest.mode === "local-bypass") {
            if (!LOCAL_BYPASS_SECRET) {
                console.warn("Local bypass attempted but LOCAL_DEV_BYPASS_SECRET is not set");
                return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(403, "Local bypass not configured"));
            }
            if (!isLocalRequest(event)) {
                console.warn("Local bypass rejected for non-local request");
                return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(403, "Local bypass is only available from localhost"));
            }
            const providedSecret = validatedRequest.secret?.trim();
            if (!providedSecret || providedSecret !== LOCAL_BYPASS_SECRET) {
                console.warn("Local bypass provided invalid secret");
                return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(401, "Invalid bypass credentials"));
            }
            const email = LOCAL_BYPASS_EMAIL || allowedEmails[0] || "dev@localhost.test";
            if (!allowedEmails.includes(email.toLowerCase())) {
                return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(403, "Access denied. Add the bypass email to ALLOWED_EMAIL."));
            }
            const sessionToken = Buffer.from(`${email}:${Date.now()}`).toString("base64");
            const cookieOptions = `Path=/; Max-Age=${60 * 60 * 48}`; // 48 hours
            const httpOnlyCookie = `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; ${cookieOptions}`;
            const clientCookie = `auth=${sessionToken}; Secure; SameSite=Strict; ${cookieOptions}`;
            return {
                statusCode: 200,
                multiValueHeaders: {
                    "Set-Cookie": [httpOnlyCookie, clientCookie]
                },
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Credentials": "true"
                },
                body: JSON.stringify({
                    verified: true,
                    user: email,
                    name: LOCAL_BYPASS_NAME || email,
                    picture: LOCAL_BYPASS_PICTURE || undefined,
                    token: sessionToken
                })
            };
        }
        if (typeof validatedRequest !== "object" ||
            !("token" in validatedRequest) ||
            !validatedRequest.token) {
            return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(400, "Token required"));
        }
        if (!GOOGLE_CLIENT_ID) {
            console.error("GOOGLE_CLIENT_ID not configured");
            return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(500, "Server configuration error"));
        }
        // Verify the Google ID token
        const client = new google_auth_library_1.OAuth2Client(GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: validatedRequest.token,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (!payload?.email) {
            return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(401, "Invalid token: no email found"));
        }
        const email = payload.email;
        if (!allowedEmails.includes(email.toLowerCase())) {
            return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(403, "Access denied. This application is private."));
        }
        const sessionToken = Buffer.from(`${email}:${Date.now()}`).toString("base64");
        const cookieOptions = `Path=/; Max-Age=${60 * 60 * 48}`; // 48 hours
        const httpOnlyCookie = `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; ${cookieOptions}`;
        const clientCookie = `auth=${sessionToken}; Secure; SameSite=Strict; ${cookieOptions}`;
        return {
            statusCode: 200,
            multiValueHeaders: {
                "Set-Cookie": [httpOnlyCookie, clientCookie]
            },
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Credentials": "true"
            },
            body: JSON.stringify({
                verified: true,
                user: email,
                name: payload.name,
                picture: payload.picture,
                token: sessionToken // Include token for localStorage fallback
            })
        };
    }
    catch (error) {
        console.error("Google OAuth verification error:", error);
        return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(401, "Authentication failed. Please try again."));
    }
};
exports.handler = handler;
