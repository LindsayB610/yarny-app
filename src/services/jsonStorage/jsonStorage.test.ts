import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSnippetJsonFileName,
  compareContent,
  type SnippetJsonData
} from "./jsonStorage";
import * as apiClientModule from "../../api/client";

vi.mock("../../api/client");

describe("jsonStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSnippetJsonFileName", () => {
    it("should generate correct filename format", () => {
      expect(getSnippetJsonFileName("snippet-123")).toBe(".snippet-123.yarny.json");
      expect(getSnippetJsonFileName("abc-def-456")).toBe(".abc-def-456.yarny.json");
    });
  });

  describe("compareContent", () => {
    it("should return false for identical content", () => {
      const content1 = "Hello world\nThis is a test";
      const content2 = "Hello world\nThis is a test";
      expect(compareContent(content1, content2)).toBe(false);
    });

    it("should return true for different content", () => {
      const content1 = "Hello world";
      const content2 = "Goodbye world";
      expect(compareContent(content1, content2)).toBe(true);
    });

    it("should normalize line endings before comparing", () => {
      const content1 = "Hello\r\nworld";
      const content2 = "Hello\nworld";
      expect(compareContent(content1, content2)).toBe(false);
    });

    it("should normalize non-breaking spaces", () => {
      const content1 = "Hello\u00A0world";
      const content2 = "Hello world";
      expect(compareContent(content1, content2)).toBe(false);
    });

    it("should trim trailing whitespace", () => {
      const content1 = "Hello world   ";
      const content2 = "Hello world";
      expect(compareContent(content1, content2)).toBe(false);
    });
  });
});



