"use strict";
/**
 * Shared types for Netlify Functions
 * These types are used across all serverless functions and should match
 * the API contract defined in src/api/contract.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSessionFromEvent = parseSessionFromEvent;
exports.createErrorResponse = createErrorResponse;
exports.createSuccessResponse = createSuccessResponse;
exports.addCorsHeaders = addCorsHeaders;
function parseSessionFromEvent(event) {
    const cookies = event.headers.cookie?.split(";") || [];
    const sessionCookie = cookies.find((c) => c.trim().startsWith("session="));
    if (!sessionCookie)
        return null;
    try {
        const sessionToken = sessionCookie.split("=")[1].trim();
        const decoded = Buffer.from(sessionToken, "base64").toString();
        const parts = decoded.split(":");
        return {
            email: parts[0],
            token: sessionToken
        };
    }
    catch (error) {
        return null;
    }
}
// Error response helper
function createErrorResponse(statusCode, error, message) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            error,
            ...(message && { message })
        })
    };
}
// Success response helper
function createSuccessResponse(data, statusCode = 200, additionalHeaders) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            ...additionalHeaders
        },
        body: JSON.stringify(data)
    };
}
// CORS headers helper
function addCorsHeaders(response) {
    return {
        ...response,
        headers: {
            ...response.headers,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Credentials": "true"
        }
    };
}
