import type {
  NetlifyFunctionEvent,
  NetlifyFunctionHandler,
  NetlifyFunctionResponse
} from "./types";
import { addCorsHeaders, createErrorResponse, createSuccessResponse } from "./types";

export const handler: NetlifyFunctionHandler = async (
  _event: NetlifyFunctionEvent
): Promise<NetlifyFunctionResponse> => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();

  if (!clientId) {
    console.error("GOOGLE_CLIENT_ID environment variable is missing or empty");
    return addCorsHeaders(
      createErrorResponse(500, "Google Client ID not configured")
    );
  }

  // Log length and first few characters for debugging (don't log full ID for security)
  console.log(
    "Serving Client ID (length:",
    clientId.length + ", prefix:",
    clientId.substring(0, 20) + "...)"
  );

  return addCorsHeaders(createSuccessResponse({ clientId }));
};

