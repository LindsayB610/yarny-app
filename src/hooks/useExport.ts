import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { apiClient } from "../api/client";
import { localBackupStore } from "../store/localBackupStore";

const CHUNK_TEXT_LIMIT = 500_000; // ~500k characters per chunk (conservative)

export type ExportDestination = "drive" | "local";

export interface ExportProgress {
  currentChunk: number;
  totalChunks: number;
  status: "idle" | "creating" | "writing" | "completed" | "error";
  destination: ExportDestination;
  error?: string;
}

interface ExportOptionsBase {
  fileName: string;
  snippets: Array<{ id: string; title: string; content: string }>;
  onProgress?: (progress: ExportProgress) => void;
  destination?: ExportDestination;
  fileExtension?: string;
}

export interface DriveExportOptions extends ExportOptionsBase {
  destination?: "drive";
  parentFolderId: string;
}

export interface LocalExportOptions extends ExportOptionsBase {
  destination: "local";
  parentFolderId?: string;
}

export type ExportOptions = DriveExportOptions | LocalExportOptions;

const INVALID_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

/**
 * Hook for exporting snippets to Google Docs with chunking support
 * Handles large exports by splitting content into multiple chunks
 */
export function useExport() {
  const [progress, setProgress] = useState<ExportProgress>({
    currentChunk: 0,
    totalChunks: 0,
    status: "idle",
    destination: "drive"
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

  const sanitizeFileName = useCallback((fileName: string): string => {
    const trimmed = fileName.trim();
    const sanitized = trimmed.replace(INVALID_FILE_CHARS, "_").replace(/\s+/g, " ");
    return sanitized.length > 0 ? sanitized : "export";
  }, []);

  const exportMutation = useMutation({
    mutationFn: async (options: ExportOptions) => {
      const destination: ExportDestination = options.destination ?? "drive";
      const { fileName, snippets, onProgress } = options;

      // Combine all snippets with titles
      let combinedContent = "";
      for (const snippet of snippets) {
        if (snippet.title) {
          combinedContent += `# ${snippet.title}\n\n`;
        }
        combinedContent += snippet.content + "\n\n";
      }

      const normalizedFileName = sanitizeFileName(fileName);

      const baseProgress: ExportProgress = {
        currentChunk: 0,
        totalChunks: destination === "local" ? 1 : 0,
        status: "creating",
        destination
      };

      setProgress(baseProgress);
      onProgress?.(baseProgress);

      if (destination === "local") {
        const { enabled, permission, repository } = localBackupStore.getState();

        if (!enabled || permission !== "granted" || !repository) {
          throw new Error(
            "Local backups must be enabled with write permission before exporting locally."
          );
        }

        const extension = options.fileExtension ?? ".md";
        const finalFileName = normalizedFileName.endsWith(extension)
          ? normalizedFileName
          : `${normalizedFileName}${extension}`;

        await repository.writeExportFile(finalFileName, combinedContent);

        const completedProgress: ExportProgress = {
          currentChunk: 1,
          totalChunks: 1,
          status: "completed",
          destination
        };
        setProgress(completedProgress);
        onProgress?.(completedProgress);

        return {
          documentId: undefined,
          documentName: finalFileName,
          destination
        };
      }

      const { parentFolderId } = options as DriveExportOptions;

      // Calculate chunks
      const chunks = calculateChunks(combinedContent);
      const totalChunks = chunks.length;

      const creatingProgress: ExportProgress = {
        currentChunk: 0,
        totalChunks,
        status: "creating",
        destination
      };
      setProgress(creatingProgress);
      onProgress?.(creatingProgress);

      // Create the initial document with first chunk
      let documentId: string | undefined;
      let documentName = normalizedFileName;

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
          const completedProgress: ExportProgress = {
            currentChunk: 1,
            totalChunks: 1,
            status: "completed",
            destination
          };
          setProgress(completedProgress);
          onProgress?.({
            currentChunk: 1,
            totalChunks: 1,
            status: "completed",
            destination
          });
          return { documentId, documentName: createResponse.name };
        }

        // Append remaining chunks
        const writingProgress: ExportProgress = {
          currentChunk: 1,
          totalChunks,
          status: "writing",
          destination
        };
        setProgress(writingProgress);
        onProgress?.({
          currentChunk: 1,
          totalChunks,
          status: "writing",
          destination
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

          const chunkProgress: ExportProgress = {
            currentChunk: i + 1,
            totalChunks,
            status: "writing",
            destination
          };
          setProgress(chunkProgress);
          onProgress?.({
            currentChunk: i + 1,
            totalChunks,
            status: "writing",
            destination
          });
        }

        const completedProgress: ExportProgress = {
          currentChunk: totalChunks,
          totalChunks,
          status: "completed",
          destination
        };
        setProgress(completedProgress);
        onProgress?.({
          currentChunk: totalChunks,
          totalChunks,
          status: "completed",
          destination
        });

        return { documentId, documentName: createResponse.name };
      } catch (error) {
        const errorProgress: ExportProgress = {
          currentChunk: 0,
          totalChunks,
          status: "error",
          destination,
          error:
            error instanceof Error ? error.message : "Export failed"
        };
        const errorMessage =
          error instanceof Error ? error.message : "Export failed";
        setProgress(errorProgress);
        onProgress?.({
          currentChunk: 0,
          totalChunks,
          status: "error",
          destination,
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

