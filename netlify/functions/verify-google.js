"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const google_auth_library_1 = require("google-auth-library");
const contract_1 = require("./contract");
const types_1 = require("./types");
const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL || "lindsayb82@gmail.com";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
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
        // Validate request body with Zod schema
        let token;
        try {
            const validated = (0, contract_1.validateRequest)(contract_1.VerifyGoogleRequestSchema, event.body, "Token required");
            token = validated.token;
        }
        catch (validationError) {
            return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(400, validationError instanceof Error ? validationError.message : "Token required"));
        }
        if (!GOOGLE_CLIENT_ID) {
            console.error("GOOGLE_CLIENT_ID not configured");
            return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(500, "Server configuration error"));
        }
        // Verify the Google ID token
        const client = new google_auth_library_1.OAuth2Client(GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (!payload?.email) {
            return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(401, "Invalid token: no email found"));
        }
        const email = payload.email;
        // Verify email is allowed (supports multiple emails separated by commas)
        const allowedEmails = ALLOWED_EMAIL.split(",").map((e) => e.trim().toLowerCase());
        if (!allowedEmails.includes(email.toLowerCase())) {
            return (0, types_1.addCorsHeaders)((0, types_1.createErrorResponse)(403, "Access denied. This application is private."));
        }
        // Create session
        const sessionToken = Buffer.from(`${email}:${Date.now()}`).toString("base64");
        // Set both HttpOnly (secure) and non-HttpOnly (for client-side checks) cookies
        // Netlify Functions needs multiple Set-Cookie headers as an array
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
