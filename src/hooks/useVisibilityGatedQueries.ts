import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { apiClient } from "../api/client";
import type { DriveReadResponse } from "../api/contract";

/**
 * Hook for visibility-gated lazy loading of snippets
 * Only loads snippets when they become visible in the viewport
 */
export function useVisibilityGatedSnippetQueries(
  snippetIds: string[],
  fileIds: Record<string, string>,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Set up intersection observer for visibility detection
  useEffect(() => {
    if (!enabled || snippetIds.length === 0) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const newVisibleIds = new Set(visibleIds);
        entries.forEach((entry) => {
          const snippetId = entry.target.getAttribute("data-snippet-id");
          if (snippetId) {
            if (entry.isIntersecting) {
              newVisibleIds.add(snippetId);
            } else {
              // Keep it in visible set for a bit to avoid flickering
              // Remove after a delay if still not visible
              setTimeout(() => {
                if (!entry.isIntersecting) {
                  setVisibleIds((prev) => {
                    const updated = new Set(prev);
                    updated.delete(snippetId);
                    return updated;
                  });
                }
              }, 1000);
            }
          }
        });
        setVisibleIds(newVisibleIds);
      },
      {
        root: null,
        rootMargin: "200px", // Start loading 200px before visible
        threshold: 0.01
      }
    );

    // Observe all snippet elements
    elementRefs.current.forEach((element) => {
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, snippetIds.length, visibleIds]);

  // Prefetch snippets that are likely to be viewed soon (next few in list)
  useEffect(() => {
    if (!enabled || snippetIds.length === 0) {
      return;
    }

    // Prefetch first 3 snippets immediately
    const prefetchCount = Math.min(3, snippetIds.length);
    for (let i = 0; i < prefetchCount; i++) {
      const snippetId = snippetIds[i];
      const fileId = fileIds[snippetId];
      if (fileId && !queryClient.getQueryData(["snippet", snippetId])) {
        queryClient.prefetchQuery({
          queryKey: ["snippet", snippetId],
          queryFn: async () => {
            const response = await apiClient.readDriveFile({ fileId });
            return response;
          },
          staleTime: 5 * 60 * 1000 // 5 minutes
        });
      }
    }
  }, [enabled, snippetIds, fileIds, queryClient]);

  // Use useQueries to load visible snippets
  const queries = useQueries({
    queries: snippetIds.map((snippetId) => {
      const fileId = fileIds[snippetId];
      const isVisible = visibleIds.has(snippetId);

      return {
        queryKey: ["snippet", snippetId],
        queryFn: async (): Promise<DriveReadResponse | null> => {
          if (!fileId) {
            return null;
          }
          return apiClient.readDriveFile({ fileId });
        },
        enabled: enabled && Boolean(fileId) && isVisible,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000 // 10 minutes (formerly cacheTime)
      };
    })
  });

  // Register element ref for intersection observer
  const registerElement = (snippetId: string, element: HTMLElement | null) => {
    if (element) {
      elementRefs.current.set(snippetId, element);
      element.setAttribute("data-snippet-id", snippetId);
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    } else {
      elementRefs.current.delete(snippetId);
    }
  };

  return {
    queries,
    registerElement,
    visibleIds
  };
}

