import type {
  NetlifyFunctionEvent,
  NetlifyFunctionHandler,
  NetlifyFunctionResponse
} from "./types";
import { createSuccessResponse } from "./types";

export const handler: NetlifyFunctionHandler = async (
  event: NetlifyFunctionEvent
): Promise<NetlifyFunctionResponse> => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "GET") {
    return createSuccessResponse(
      { error: "Method not allowed" },
      405
    );
  }

  // Clear session and auth cookies by setting them to expire immediately
  const clearSessionCookie =
    "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; HttpOnly; Secure; SameSite=Strict";
  const clearAuthCookie =
    "auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure; SameSite=Strict";
  const clearDriveAuthCookie =
    "drive_auth_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure; SameSite=Strict";

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

