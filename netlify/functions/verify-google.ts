import { OAuth2Client } from "google-auth-library";
import type {
  NetlifyFunctionEvent,
  NetlifyFunctionHandler,
  NetlifyFunctionResponse
} from "./types";
import { addCorsHeaders, createErrorResponse, createSuccessResponse } from "./types";

interface VerifyGoogleRequest {
  token: string;
}

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL || "lindsayb82@gmail.com";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export const handler: NetlifyFunctionHandler = async (
  event: NetlifyFunctionEvent
): Promise<NetlifyFunctionResponse> => {
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
    return addCorsHeaders(
      createErrorResponse(405, "Method not allowed")
    );
  }

  try {
    if (!event.body) {
      return addCorsHeaders(
        createErrorResponse(400, "Token required")
      );
    }

    const { token } = JSON.parse(event.body) as VerifyGoogleRequest;

    if (!token) {
      return addCorsHeaders(
        createErrorResponse(400, "Token required")
      );
    }

    if (!GOOGLE_CLIENT_ID) {
      console.error("GOOGLE_CLIENT_ID not configured");
      return addCorsHeaders(
        createErrorResponse(500, "Server configuration error")
      );
    }

    // Verify the Google ID token
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return addCorsHeaders(
        createErrorResponse(401, "Invalid token: no email found")
      );
    }

    const email = payload.email;

    // Verify email is allowed (supports multiple emails separated by commas)
    const allowedEmails = ALLOWED_EMAIL.split(",").map((e) => e.trim().toLowerCase());
    if (!allowedEmails.includes(email.toLowerCase())) {
      return addCorsHeaders(
        createErrorResponse(403, "Access denied. This application is private.")
      );
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
  } catch (error) {
    console.error("Google OAuth verification error:", error);
    return addCorsHeaders(
      createErrorResponse(401, "Authentication failed. Please try again.")
    );
  }
};

