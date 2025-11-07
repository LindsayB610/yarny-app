import { getStore } from "@netlify/blobs";
import { OAuth2Client, type Credentials } from "google-auth-library";
import { google, type drive_v3 } from "googleapis";

const GDRIVE_CLIENT_ID = (process.env.GDRIVE_CLIENT_ID || "").trim();
const GDRIVE_CLIENT_SECRET = (process.env.GDRIVE_CLIENT_SECRET || "").trim();
const STORAGE_KEY = "drive_tokens.json";

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface DriveTokens extends Credentials {
  refresh_token?: string;
  scope?: string;
}

interface TokenStore {
  [email: string]: DriveTokens;
}

// Validate client ID format (shared validation)
function validateClientId(clientId: string): ValidationResult {
  if (!clientId) return { valid: false, error: "Client ID is empty" };
  const invalidChars = /[^a-zA-Z0-9._-]/.exec(clientId);
  if (invalidChars) {
    return {
      valid: false,
      error: `Client ID contains invalid character: "${invalidChars[0]}"`
    };
  }
  if (clientId.includes(" ")) {
    return { valid: false, error: "Client ID contains spaces" };
  }
  return { valid: true };
}

// Validate client secret format (shared validation)
function validateClientSecret(clientSecret: string): ValidationResult {
  if (!clientSecret) return { valid: false, error: "Client Secret is empty" };
  const invalidChars = /[^a-zA-Z0-9_-]/.exec(clientSecret);
  if (invalidChars) {
    return {
      valid: false,
      error: `Client Secret contains invalid character: "${invalidChars[0]}"`
    };
  }
  if (clientSecret.includes(" ")) {
    return { valid: false, error: "Client Secret contains spaces" };
  }
  return { valid: true };
}

interface StoreOptions {
  name: string;
  siteID?: string;
  token?: string;
}

function getStoreOptions(): StoreOptions {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN;

  const storeOptions: StoreOptions = { name: "drive-tokens" };
  if (siteID) {
    storeOptions.siteID = siteID;
  }
  if (token) {
    storeOptions.token = token;
  }
  return storeOptions;
}

export async function getTokens(email: string): Promise<DriveTokens | null> {
  try {
    const store = getStore(getStoreOptions());

    let allTokens: TokenStore = {};
    try {
      const data = await store.get(STORAGE_KEY);
      if (data && typeof data === "string") {
        allTokens = JSON.parse(data) as TokenStore;
      }
    } catch (error) {
      // No data exists yet
      console.log("getTokens - no existing data, starting fresh");
    }

    console.log("getTokens - looking for email:", email);
    console.log("getTokens - available emails:", Object.keys(allTokens));
    const tokens = allTokens[email] || null;
    console.log("getTokens - found tokens:", !!tokens);
    return tokens;
  } catch (error) {
    console.log(
      "getTokens - error:",
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

export async function saveTokens(
  email: string,
  tokens: DriveTokens
): Promise<void> {
  try {
    const store = getStore(getStoreOptions());

    let allTokens: TokenStore = {};
    try {
      const data = await store.get(STORAGE_KEY);
      if (data && typeof data === "string") {
        allTokens = JSON.parse(data) as TokenStore;
      }
    } catch (error) {
      // No data exists yet, start fresh
    }

    allTokens[email] = tokens;
    await store.set(STORAGE_KEY, JSON.stringify(allTokens, null, 2));
    console.log("saveTokens - tokens saved successfully for:", email);
  } catch (error) {
    console.error(
      "saveTokens - error saving:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

async function refreshAccessToken(
  email: string,
  refreshToken: string
): Promise<Credentials> {
  if (!GDRIVE_CLIENT_ID || !GDRIVE_CLIENT_SECRET) {
    throw new Error(
      "Missing Drive OAuth credentials. Please configure GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET."
    );
  }

  // Validate credentials format
  const clientIdValidation = validateClientId(GDRIVE_CLIENT_ID);
  const clientSecretValidation = validateClientSecret(GDRIVE_CLIENT_SECRET);
  if (!clientIdValidation.valid || !clientSecretValidation.valid) {
    const errors: string[] = [];
    if (!clientIdValidation.valid)
      errors.push(`Client ID: ${clientIdValidation.error}`);
    if (!clientSecretValidation.valid)
      errors.push(`Client Secret: ${clientSecretValidation.error}`);
    throw new Error(`Invalid credentials format: ${errors.join("; ")}`);
  }

  const oauth2Client = new OAuth2Client(
    GDRIVE_CLIENT_ID,
    GDRIVE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

// Extended Drive client type that includes _auth access via Proxy
export interface DriveClientWithAuth extends drive_v3.Drive {
  _auth?: OAuth2Client;
}

export async function getAuthenticatedDriveClient(
  email: string
): Promise<DriveClientWithAuth> {
  if (!GDRIVE_CLIENT_ID || !GDRIVE_CLIENT_SECRET) {
    throw new Error(
      "Missing Drive OAuth credentials. Please configure GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET."
    );
  }

  // Validate credentials format
  const clientIdValidation = validateClientId(GDRIVE_CLIENT_ID);
  const clientSecretValidation = validateClientSecret(GDRIVE_CLIENT_SECRET);
  if (!clientIdValidation.valid || !clientSecretValidation.valid) {
    const errors: string[] = [];
    if (!clientIdValidation.valid)
      errors.push(`Client ID: ${clientIdValidation.error}`);
    if (!clientSecretValidation.valid)
      errors.push(`Client Secret: ${clientSecretValidation.error}`);
    throw new Error(`Invalid credentials format: ${errors.join("; ")}`);
  }

  let tokens = await getTokens(email);

  if (!tokens) {
    throw new Error("No Drive tokens found. Please authorize Drive access.");
  }

  // Check if token is expired (with 5 minute buffer)
  const now = Date.now();
  const expiryTime = tokens.expiry_date;

  if (!expiryTime || now >= expiryTime - 300000) {
    // Token expired or expiring soon, refresh it
    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token available. Please re-authorize Drive access."
      );
    }

    const newTokens = await refreshAccessToken(email, tokens.refresh_token);

    // Update stored tokens - preserve scope from original tokens
    // Refresh tokens maintain the original scopes, so new access token has same scopes
    tokens = {
      access_token: newTokens.access_token,
      refresh_token: tokens.refresh_token, // Keep original refresh token
      expiry_date: newTokens.expiry_date,
      scope: tokens.scope || newTokens.scope // Preserve scope from original or use from refresh
    };

    console.log("Refreshed tokens - scope preserved:", tokens.scope);
    await saveTokens(email, tokens);
  }

  // Create OAuth2 client with current tokens
  const oauth2Client = new OAuth2Client(
    GDRIVE_CLIENT_ID,
    GDRIVE_CLIENT_SECRET
  );

  // Set credentials including access token and refresh token
  // The refresh token will automatically refresh the access token if it expires
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token
  });

  // Enable automatic token refresh
  oauth2Client.on("tokens", (newTokens) => {
    if (newTokens.access_token) {
      // Update stored tokens when automatically refreshed
      tokens.access_token = newTokens.access_token;
      if (newTokens.expiry_date) {
        tokens.expiry_date = newTokens.expiry_date;
      }
      // Save updated tokens
      saveTokens(email, tokens).catch((err) => {
        console.error("Error saving auto-refreshed tokens:", err);
      });
    }
  });

  // Return Drive API client and auth client
  const driveClient = google.drive({ version: "v3", auth: oauth2Client });

  // Wrap the drive client in a Proxy to allow accessing _auth without modifying the object
  // The driveClient object is not extensible, so we can't attach properties directly
  const driveClientProxy = new Proxy(driveClient, {
    get: function (target, prop, _receiver) {
      // If accessing _auth, return the oauth2Client
      if (prop === "_auth") {
        return oauth2Client;
      }
      // Otherwise, forward all other property accesses to the original driveClient
      const value = (target as unknown as Record<string, unknown>)[prop as string];
      // If it's a function, bind it to the original target to preserve 'this' context
      if (typeof value === "function") {
        return (value as (...args: unknown[]) => unknown).bind(target);
      }
      // If it's an object, wrap it in a Proxy too to ensure _auth access works on nested objects
      if (value && typeof value === "object") {
        return value; // Return the object as-is (it won't have _auth but that's fine for nested objects)
      }
      return value;
    },
    set: function (target, prop, value) {
      // Allow setting _auth (though it will only exist on the proxy, not the original object)
      if (prop === "_auth") {
        // Don't actually set it, just return true to indicate success
        // The proxy will handle returning oauth2Client when _auth is accessed
        return true;
      }
      // For other properties, try to set on the original object (may fail if not extensible)
      try {
        (target as unknown as Record<string, unknown>)[prop as string] = value;
        return true;
      } catch (e) {
        // If setting fails (object not extensible), just return true anyway
        // The property won't be set but we won't throw an error
        return true;
      }
    },
    has: function (target, prop) {
      // Check if property exists on target or if it's _auth
      return prop === "_auth" || prop in target;
    }
  }) as DriveClientWithAuth;

  console.log("Drive client created - _auth accessible via proxy");

  return driveClientProxy; // Return proxied drive client with _auth support
}

