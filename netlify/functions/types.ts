/**
 * Shared types for Netlify Functions
 * These types are used across all serverless functions and should match
 * the API contract defined in src/api/contract.ts
 */

export interface NetlifyFunctionEvent {
  httpMethod: string;
  path: string;
  pathParameters: Record<string, string> | null;
  queryStringParameters: Record<string, string> | null;
  headers: Record<string, string>;
  body: string | null;
  isBase64Encoded: boolean;
}

export interface NetlifyFunctionContext {
  callbackWaitsForEmptyEventLoop: boolean;
  functionName: string;
  functionVersion: string;
  invokedFunctionArn: string;
  memoryLimitInMB: string;
  awsRequestId: string;
  logGroupName: string;
  logStreamName: string;
}

export interface NetlifyFunctionResponse {
  statusCode: number;
  headers?: Record<string, string>;
  multiValueHeaders?: Record<string, string[]>;
  body?: string; // Optional for redirects (302, etc.)
  isBase64Encoded?: boolean;
}

export type NetlifyFunctionHandler = (
  event: NetlifyFunctionEvent,
  context: NetlifyFunctionContext
) => Promise<NetlifyFunctionResponse>;

// Helper function to extract user email from session cookie
export interface UserSession {
  email: string;
  token: string;
}

export function parseSessionFromEvent(event: NetlifyFunctionEvent): UserSession | null {
  const cookies = event.headers.cookie?.split(";") ?? [];
  const sessionCookie = cookies.find((c) => c.trim().startsWith("session="));
  if (!sessionCookie) return null;

  try {
    const cookieValue = sessionCookie.split("=")[1];
    if (!cookieValue) {
      return null;
    }
    const sessionToken = cookieValue.trim();
    const decoded = Buffer.from(sessionToken, "base64").toString();
    const parts = decoded.split(":");
    if (parts.length === 0 || !parts[0]) {
      return null;
    }
    return {
      email: parts[0],
      token: sessionToken
    };
  } catch (error) {
    return null;
  }
}

// Error response helper
export function createErrorResponse(
  statusCode: number,
  error: string,
  message?: string
): NetlifyFunctionResponse {
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
export function createSuccessResponse<T>(
  data: T,
  statusCode = 200,
  additionalHeaders?: Record<string, string>
): NetlifyFunctionResponse {
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
export function addCorsHeaders(response: NetlifyFunctionResponse): NetlifyFunctionResponse {
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

