import { describe, expect, it } from "vitest";
import { parseApiResponse } from "../../src/api/contract";
import {
  ConfigResponseSchema,
  DriveReadResponseSchema,
  DriveWriteResponseSchema,
  DriveListResponseSchema
} from "../../src/api/contract";

describe("API Contract Validation", () => {
  describe("ConfigResponse", () => {
    it("validates correct config response", () => {
      const data = { clientId: "test-client-id" };
      const result = parseApiResponse(ConfigResponseSchema, data);
      expect(result.clientId).toBe("test-client-id");
    });

    it("throws error for invalid config response", () => {
      const data = { clientId: 123 }; // Wrong type
      expect(() => parseApiResponse(ConfigResponseSchema, data)).toThrow();
    });
  });

  describe("DriveReadResponse", () => {
    it("validates correct read response", () => {
      const data = {
        id: "file-123",
        name: "Test Document",
        content: "Test content",
        modifiedTime: "2025-01-01T00:00:00.000Z",
        mimeType: "application/vnd.google-apps.document"
      };
      const result = parseApiResponse(DriveReadResponseSchema, data);
      expect(result.id).toBe("file-123");
      expect(result.content).toBe("Test content");
    });

    it("throws error for missing required fields", () => {
      const data = {
        id: "file-123"
        // Missing name and content
      };
      expect(() => parseApiResponse(DriveReadResponseSchema, data)).toThrow();
    });
  });

  describe("DriveWriteResponse", () => {
    it("validates correct write response", () => {
      const data = {
        id: "file-123",
        name: "New Document",
        modifiedTime: "2025-01-01T00:00:00.000Z"
      };
      const result = parseApiResponse(DriveWriteResponseSchema, data);
      expect(result.id).toBe("file-123");
      expect(result.name).toBe("New Document");
    });
  });

  describe("DriveListResponse", () => {
    it("validates correct list response with files", () => {
      const data = {
        files: [
          {
            id: "file-1",
            name: "File 1",
            mimeType: "application/vnd.google-apps.document"
          }
        ]
      };
      const result = parseApiResponse(DriveListResponseSchema, data);
      expect(result.files).toHaveLength(1);
      expect(result.files?.[0].id).toBe("file-1");
    });

    it("validates empty list response", () => {
      const data = { files: [] };
      const result = parseApiResponse(DriveListResponseSchema, data);
      expect(result.files).toEqual([]);
    });

    it("validates list response with nextPageToken", () => {
      const data = {
        files: [],
        nextPageToken: "token-123"
      };
      const result = parseApiResponse(DriveListResponseSchema, data);
      expect(result.nextPageToken).toBe("token-123");
    });
  });
});

