import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { apiClient } from "../api/client";

// Google Docs API batchUpdate has a limit of ~50MB per request
// For plain text, we'll use a conservative limit of 1MB per chunk
// This accounts for the JSON structure overhead
const CHUNK_SIZE_LIMIT = 1 * 1024 * 1024; // 1MB in bytes
const CHUNK_TEXT_LIMIT = 500_000; // ~500k characters per chunk (conservative)

export interface ExportProgress {
  currentChunk: number;
  totalChunks: number;
  status: "idle" | "creating" | "writing" | "completed" | "error";
  error?: string;
}

export interface ExportOptions {
  fileName: string;
  parentFolderId: string;
  snippets: Array<{ id: string; title: string; content: string }>;
  onProgress?: (progress: ExportProgress) => void;
}

/**
 * Hook for exporting snippets to Google Docs with chunking support
 * Handles large exports by splitting content into multiple chunks
 */
export function useExport() {
  const [progress, setProgress] = useState<ExportProgress>({
    currentChunk: 0,
    totalChunks: 0,
    status: "idle"
  });

  const calculateChunks = useCallback((content: string): string[] => {
    const chunks: string[] = [];
    let currentChunk = "";

    // Split by paragraphs first to avoid breaking in the middle of content
    const paragraphs = content.split(/\n\n+/);

    for (const paragraph of paragraphs) {
      const paragraphWithNewlines = paragraph + "\n\n";
      const testChunk = currentChunk + paragraphWithNewlines;

      // Check if adding this paragraph would exceed the limit
      if (testChunk.length > CHUNK_TEXT_LIMIT && currentChunk.length > 0) {
        // Save current chunk and start new one
        chunks.push(currentChunk.trim());
        currentChunk = paragraphWithNewlines;
      } else {
        currentChunk = testChunk;
      }
    }

    // Add remaining content
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    // If no chunks were created (content is smaller than limit), return single chunk
    if (chunks.length === 0) {
      chunks.push(content);
    }

    return chunks;
  }, []);

  const exportMutation = useMutation({
    mutationFn: async (options: ExportOptions) => {
      const { fileName, parentFolderId, snippets, onProgress } = options;

      // Combine all snippets with titles
      let combinedContent = "";
      for (const snippet of snippets) {
        if (snippet.title) {
          combinedContent += `# ${snippet.title}\n\n`;
        }
        combinedContent += snippet.content + "\n\n";
      }

      // Calculate chunks
      const chunks = calculateChunks(combinedContent);
      const totalChunks = chunks.length;

      setProgress({
        currentChunk: 0,
        totalChunks,
        status: "creating"
      });
      onProgress?.({
        currentChunk: 0,
        totalChunks,
        status: "creating"
      });

      // Create the initial document with first chunk
      let documentId: string | undefined;
      let documentName = fileName;

      try {
        // Create document with first chunk
        const firstChunk = chunks[0];
        const createResponse = await apiClient.writeDriveFile({
          fileName: documentName,
          content: firstChunk,
          parentFolderId,
          mimeType: "application/vnd.google-apps.document"
        });

        documentId = createResponse.id;

        // If there's only one chunk, we're done
        if (chunks.length === 1) {
          setProgress({
            currentChunk: 1,
            totalChunks: 1,
            status: "completed"
          });
          onProgress?.({
            currentChunk: 1,
            totalChunks: 1,
            status: "completed"
          });
          return { documentId, documentName: createResponse.name };
        }

        // Append remaining chunks
        setProgress({
          currentChunk: 1,
          totalChunks,
          status: "writing"
        });
        onProgress?.({
          currentChunk: 1,
          totalChunks,
          status: "writing"
        });

        // For remaining chunks, we need to append to the document
        // Since we're using the write API which replaces content, we need to
        // read existing content and append new chunks
        // For now, we'll write chunks sequentially by reading and appending
        let accumulatedContent = firstChunk;

        for (let i = 1; i < chunks.length; i++) {
          const chunk = chunks[i];
          accumulatedContent += "\n\n" + chunk;

          // Update the document with accumulated content
          await apiClient.writeDriveFile({
            fileId: documentId,
            fileName: documentName,
            content: accumulatedContent,
            parentFolderId,
            mimeType: "application/vnd.google-apps.document"
          });

          setProgress({
            currentChunk: i + 1,
            totalChunks,
            status: "writing"
          });
          onProgress?.({
            currentChunk: i + 1,
            totalChunks,
            status: "writing"
          });
        }

        setProgress({
          currentChunk: totalChunks,
          totalChunks,
          status: "completed"
        });
        onProgress?.({
          currentChunk: totalChunks,
          totalChunks,
          status: "completed"
        });

        return { documentId, documentName: createResponse.name };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Export failed";
        setProgress({
          currentChunk: 0,
          totalChunks,
          status: "error",
          error: errorMessage
        });
        onProgress?.({
          currentChunk: 0,
          totalChunks,
          status: "error",
          error: errorMessage
        });
        throw error;
      }
    }
  });

  const exportSnippets = useCallback(
    (options: ExportOptions) => {
      return exportMutation.mutateAsync(options);
    },
    [exportMutation]
  );

  return {
    exportSnippets,
    isExporting: exportMutation.isPending,
    progress,
    error: exportMutation.error
  };
}

