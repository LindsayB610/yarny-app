"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const google_auth_library_1 = require("google-auth-library");
const crypto_1 = __importDefault(require("crypto"));
const types_1 = require("./types");
const drive_client_1 = require("./drive-client");
const GDRIVE_CLIENT_ID = (process.env.GDRIVE_CLIENT_ID || "").trim();
const GDRIVE_CLIENT_SECRET = (process.env.GDRIVE_CLIENT_SECRET || "").trim();
// Validate client ID format
function validateClientId(clientId) {
    if (!clientId)
        return { valid: false, error: "Client ID is empty" };
    const invalidChars = /[^a-zA-Z0-9._-]/.exec(clientId);
    if (invalidChars) {
        return {
            valid: false,
            error: `Client ID contains invalid character: "${invalidChars[0]}" at position ${invalidChars.index}`
        };
    }
    if (!clientId.endsWith(".apps.googleusercontent.com")) {
        console.warn("Client ID does not end with .apps.googleusercontent.com - may not be a valid Google OAuth client ID");
    }
    if (clientId.includes(" ")) {
        return { valid: false, error: "Client ID contains spaces (should be trimmed)" };
    }
    return { valid: true };
}
// Validate client secret format
function validateClientSecret(clientSecret) {
    if (!clientSecret)
        return { valid: false, error: "Client Secret is empty" };
    const invalidChars = /[^a-zA-Z0-9_-]/.exec(clientSecret);
    if (invalidChars) {
        return {
            valid: false,
            error: `Client Secret contains invalid character: "${invalidChars[0]}" at position ${invalidChars.index}`
        };
    }
    if (clientSecret.includes(" ")) {
        return { valid: false, error: "Client Secret contains spaces (should be trimmed)" };
    }
    if (clientSecret.length < 20 || clientSecret.length > 100) {
        console.warn(`Client Secret length (${clientSecret.length}) is unusual - typical range is 24-40 characters`);
    }
    return { valid: true };
}
const handler = async (event) => {
    if (event.httpMethod !== "GET") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method not allowed" })
        };
    }
    // Validate environment variables
    if (!GDRIVE_CLIENT_ID || !GDRIVE_CLIENT_SECRET) {
        console.error("Missing Drive OAuth credentials");
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Server configuration error: Missing Drive OAuth credentials. Please configure GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET."
            })
        };
    }
    // Validate client ID format
    const clientIdValidation = validateClientId(GDRIVE_CLIENT_ID);
    if (!clientIdValidation.valid) {
        console.error("Invalid Client ID:", clientIdValidation.error);
        console.error("Client ID value (first/last 20 chars):", GDRIVE_CLIENT_ID.substring(0, 20) +
            "..." +
            GDRIVE_CLIENT_ID.substring(GDRIVE_CLIENT_ID.length - 20));
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Invalid Client ID format: ${clientIdValidation.error}` })
        };
    }
    // Validate client secret format
    const clientSecretValidation = validateClientSecret(GDRIVE_CLIENT_SECRET);
    if (!clientSecretValidation.valid) {
        console.error("Invalid Client Secret:", clientSecretValidation.error);
        console.error("Client Secret length:", GDRIVE_CLIENT_SECRET.length);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: `Invalid Client Secret format: ${clientSecretValidation.error}`
            })
        };
    }
    console.log("Drive OAuth credentials check:");
    console.log("Client ID present:", !!GDRIVE_CLIENT_ID);
    console.log("Client ID length (after trim):", GDRIVE_CLIENT_ID?.length);
    console.log("Client ID prefix:", GDRIVE_CLIENT_ID?.substring(0, 20) + "...");
    console.log("Client ID suffix:", "..." + GDRIVE_CLIENT_ID?.substring(GDRIVE_CLIENT_ID.length - 10));
    console.log("Client ID validation: PASSED");
    console.log("Client Secret present:", !!GDRIVE_CLIENT_SECRET);
    console.log("Client Secret length (after trim):", GDRIVE_CLIENT_SECRET?.length);
    console.log("Client Secret validation: PASSED");
    const { code, state, error } = event.queryStringParameters || {};
    if (error) {
        return {
            statusCode: 302,
            headers: {
                Location: "/stories.html?drive_auth_error=" + encodeURIComponent(error)
            },
            body: ""
        };
    }
    if (!code || !state) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing code or state parameter" })
        };
    }
    // Verify state parameter (CSRF protection)
    // State format: base64(email):randomHexState
    const stateParts = state.split(":");
    if (stateParts.length !== 2) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid state parameter format" })
        };
    }
    const [emailEncoded, randomState] = stateParts;
    let email;
    try {
        email = Buffer.from(emailEncoded, "base64").toString("utf8");
    }
    catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid state parameter encoding" })
        };
    }
    // Verify random state matches cookie (CSRF protection)
    const cookies = event.headers.cookie?.split(";") || [];
    const stateCookie = cookies.find((c) => c.trim().startsWith("drive_auth_state="));
    if (!stateCookie) {
        console.error("State cookie not found. Available cookies:", cookies.map((c) => c.trim()));
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "State cookie not found" })
        };
    }
    // Extract cookie value (handle potential attributes after the value)
    const cookieState = stateCookie.split("=")[1].split(";")[0].trim();
    if (cookieState !== randomState) {
        console.error("State mismatch. Expected:", randomState, "Got:", cookieState);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid state parameter" })
        };
    }
    // Verify the email matches the session (if session cookie is present)
    // This provides an additional security check, but we proceed even if session cookie is missing
    // since the state parameter contains the email and was verified via the state cookie
    const session = (0, types_1.parseSessionFromEvent)(event);
    if (session && session.email !== email) {
        console.error("Email mismatch. Session:", session.email, "State:", email);
        return {
            statusCode: 403,
            body: JSON.stringify({ error: "Email mismatch" })
        };
    }
    // Use email from state parameter (not from session cookie)
    // This allows OAuth to work even if session cookie isn't sent due to SameSite=Strict
    // Determine redirect URI - must match exactly what's configured in Google Cloud Console
    const host = event.headers.host || event.headers["x-forwarded-host"];
    const protocol = host?.includes("localhost") ? "http" : "https";
    const redirectUri = process.env.GDRIVE_REDIRECT_URI ||
        process.env.GOOGLE_REDIRECT_URI ||
        `${protocol}://${host}/.netlify/functions/drive-auth-callback`;
    console.log("Callback received - Redirect URI:", redirectUri);
    console.log("Host:", host);
    console.log("Protocol:", protocol);
    console.log("Expected redirect URI (must match Google Cloud Console):", redirectUri);
    // Exchange code for tokens
    const oauth2Client = new google_auth_library_1.OAuth2Client(GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET, redirectUri);
    try {
        console.log("Attempting token exchange...");
        console.log("Redirect URI:", redirectUri);
        console.log("Redirect URI length:", redirectUri.length);
        console.log("Client ID (first 20 chars):", GDRIVE_CLIENT_ID?.substring(0, 20) + "...");
        console.log("Client ID (last 20 chars):", "..." + GDRIVE_CLIENT_ID?.substring(GDRIVE_CLIENT_ID.length - 20));
        console.log("Client Secret (first 10 chars):", GDRIVE_CLIENT_SECRET?.substring(0, 10) + "...");
        console.log("Client Secret (last 10 chars):", "..." + GDRIVE_CLIENT_SECRET?.substring(GDRIVE_CLIENT_SECRET.length - 10));
        console.log("Code present:", !!code);
        console.log("Code length:", code?.length);
        // Log a hash of the credentials to verify they're consistent (not logging full values for security)
        const clientIdHash = crypto_1.default.createHash("sha256").update(GDRIVE_CLIENT_ID).digest("hex").substring(0, 8);
        const secretHash = crypto_1.default
            .createHash("sha256")
            .update(GDRIVE_CLIENT_SECRET)
            .digest("hex")
            .substring(0, 8);
        console.log("Client ID hash (first 8 chars):", clientIdHash);
        console.log("Client Secret hash (first 8 chars):", secretHash);
        const { tokens } = await oauth2Client.getToken(code);
        console.log("Token exchange successful");
        console.log("Has access_token:", !!tokens.access_token);
        console.log("Has refresh_token:", !!tokens.refresh_token);
        console.log("Token scope:", tokens.scope);
        // Verify that tokens include the Docs API scope
        const hasDriveScope = tokens.scope?.includes("drive.file") ||
            tokens.scope?.includes("https://www.googleapis.com/auth/drive.file");
        const hasDocsScope = tokens.scope?.includes("documents") ||
            tokens.scope?.includes("https://www.googleapis.com/auth/documents");
        console.log("Has Drive scope:", hasDriveScope);
        console.log("Has Docs scope:", hasDocsScope);
        if (!hasDocsScope) {
            console.error("WARNING: Tokens do not include Google Docs API scope!");
            console.error("Token scopes:", tokens.scope);
        }
        // Save tokens (access_token, refresh_token, expiry_date, scope)
        await (0, drive_client_1.saveTokens)(email, {
            access_token: tokens.access_token || undefined,
            refresh_token: tokens.refresh_token || undefined,
            expiry_date: tokens.expiry_date || undefined,
            scope: tokens.scope || undefined // Store scope for verification
        });
        console.log("Tokens saved successfully for:", email);
        // OPTIMIZATION: Proactively create the Yarny Stories folder during callback
        // This saves a round trip when the user first lands on the stories page
        // We do this in the background and don't wait for it to complete
        // The folder will be created/retrieved on stories page load anyway
        (async () => {
            try {
                const drive = await (0, drive_client_1.getAuthenticatedDriveClient)(email);
                const YARNY_STORIES_FOLDER = "Yarny Stories";
                const OLD_YARNY_FOLDER = "Yarny";
                const escapeQuery = (name) => name.replace(/'/g, "\\'");
                const escapedNew = escapeQuery(YARNY_STORIES_FOLDER);
                const escapedOld = escapeQuery(OLD_YARNY_FOLDER);
                const query = `(name='${escapedNew}' or name='${escapedOld}') and mimeType='application/vnd.google-apps.folder' and trashed=false`;
                const existingFolders = await drive.files.list({
                    q: query,
                    fields: "files(id, name)",
                    spaces: "drive"
                });
                // If folder doesn't exist, create it
                if (!existingFolders.data.files || existingFolders.data.files.length === 0) {
                    await drive.files.create({
                        requestBody: {
                            name: YARNY_STORIES_FOLDER,
                            mimeType: "application/vnd.google-apps.folder"
                        },
                        fields: "id, name"
                    });
                    console.log("Proactively created Yarny Stories folder for:", email);
                }
            }
            catch (error) {
                // Non-critical - folder will be created on stories page load if this fails
                console.warn("Failed to proactively create folder during callback:", error instanceof Error ? error.message : String(error));
            }
        })();
        // Clear state cookie (with SameSite=Lax to match original cookie)
        const clearStateCookie = "drive_auth_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax; Secure;";
        return {
            statusCode: 302,
            multiValueHeaders: {
                "Set-Cookie": [clearStateCookie]
            },
            headers: {
                Location: "/stories.html?drive_auth_success=true"
            },
            body: ""
        };
    }
    catch (error) {
        console.error("Token exchange error:", error);
        console.error("Error message:", error instanceof Error ? error.message : String(error));
        if (error instanceof Error && "code" in error) {
            console.error("Error code:", error.code);
        }
        if (error instanceof Error && "response" in error) {
            const response = error.response;
            console.error("Error response:", response?.data);
        }
        // More detailed error message
        let errorMessage = "Token exchange failed";
        if (error instanceof Error && error.message) {
            errorMessage += ": " + error.message;
        }
        if (error instanceof Error &&
            "response" in error &&
            typeof error
                .response?.data?.error_description === "string") {
            const responseData = error.response?.data;
            errorMessage += " - " + responseData?.error_description;
        }
        if (error instanceof Error &&
            "response" in error &&
            typeof error.response?.data?.error ===
                "string" &&
            error.response?.data?.error ===
                "invalid_client") {
            errorMessage += "\n\nTroubleshooting:";
            errorMessage +=
                "\n1. Verify GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET in Netlify env vars match EXACTLY what's in Google Cloud Console";
            errorMessage +=
                "\n2. Ensure the Client ID and Client Secret belong to the SAME OAuth 2.0 client";
            errorMessage += '\n3. Check that the OAuth client type is "Web application" (not Desktop app or other)';
            errorMessage +=
                "\n4. Verify redirect URI matches Google Cloud Console EXACTLY (including trailing slashes): " +
                    redirectUri;
            errorMessage += "\n5. If you regenerated the client secret, make sure you updated the env var";
            errorMessage += "\n6. Ensure Google Drive API is enabled for this OAuth client's project";
            errorMessage += "\n7. Check that the OAuth consent screen is configured correctly";
        }
        return {
            statusCode: 302,
            headers: {
                Location: "/stories.html?drive_auth_error=" + encodeURIComponent(errorMessage)
            },
            body: ""
        };
    }
};
exports.handler = handler;
