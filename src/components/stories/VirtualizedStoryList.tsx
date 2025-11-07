import { Box, useTheme, useMediaQuery } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useMemo, useEffect, type JSX } from "react";

import { StoryCard } from "./StoryCard";
import type { StoryFolder } from "../../hooks/useStoriesQuery";

interface VirtualizedStoryListProps {
  stories: (StoryFolder & { searchQuery?: string })[];
  /**
   * Threshold for enabling virtualization. If stories.length >= threshold, virtualization is enabled.
   * Default: 20 stories
   */
  virtualizationThreshold?: number;
}

/**
 * Virtualized story list component
 * Uses @tanstack/react-virtual for efficient rendering of large story lists.
 * Automatically enables virtualization when story count exceeds threshold.
 */
export function VirtualizedStoryList({
  stories,
  virtualizationThreshold = 20
}: VirtualizedStoryListProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"));
  const isSm = useMediaQuery(theme.breakpoints.up("sm"));

  // Calculate columns based on breakpoints
  const columnsPerRow = useMemo(() => {
    if (isMd) return 3;
    if (isSm) return 2;
    return 1;
  }, [isMd, isSm]);

  // Determine if we should use virtualization based on story count
  const shouldVirtualize = stories.length >= virtualizationThreshold;

  const rowsCount = Math.ceil(stories.length / columnsPerRow);

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? rowsCount : stories.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 240, // Estimated height of a story card row (card height + gap)
    overscan: 2
  });

  // Trigger re-render when window resizes to recalculate columns
  // The useMediaQuery hooks will automatically update, but we need to trigger virtualizer recalculation
  useEffect(() => {
    if (typeof window === "undefined" || !shouldVirtualize) return;

    const handleResize = () => {
      // Force virtualizer to recalculate by updating the count
      virtualizer.measure();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [shouldVirtualize, virtualizer, columnsPerRow]);

  // If virtualization is not needed, render as a regular grid
  if (!shouldVirtualize) {
    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)"
          },
          gap: 2
        }}
      >
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} searchQuery={story.searchQuery} />
        ))}
      </Box>
    );
  }

  // Virtualized rendering
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <Box
      ref={parentRef}
      sx={{
        height: "600px", // Fixed height container for virtualization
        overflow: "auto",
        // Custom scrollbar styling
        "&::-webkit-scrollbar": {
          width: "8px"
        },
        "&::-webkit-scrollbar-track": {
          background: "rgba(0, 0, 0, 0.1)",
          borderRadius: "4px"
        },
        "&::-webkit-scrollbar-thumb": {
          background: "rgba(255, 255, 255, 0.3)",
          borderRadius: "4px",
          "&:hover": {
            background: "rgba(255, 255, 255, 0.5)"
          }
        }
      }}
    >
      <Box
        sx={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative"
        }}
      >
        {virtualItems.map((virtualRow) => {
          const rowIndex = virtualRow.index;
          const startIdx = rowIndex * columnsPerRow;
          const endIdx = Math.min(startIdx + columnsPerRow, stories.length);
          const rowStories = stories.slice(startIdx, endIdx);

          return (
            <Box
              key={virtualRow.key}
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)"
                },
                gap: 2,
                padding: 1
              }}
            >
              {rowStories.map((story) => (
                <StoryCard key={story.id} story={story} searchQuery={story.searchQuery} />
              ))}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/**
 * Future implementation (commented out for reference):
 *
 * return (
 *   <Box
 *     ref={parentRef}
 *     sx={{
 *       height: "600px", // Fixed height container for virtualization
 *       overflow: "auto"
 *     }}
 *   >
 *     <Box
 *       sx={{
 *         height: `${virtualizer.getTotalSize()}px`,
 *         width: "100%",
 *         position: "relative"
 *       }}
 *     >
 *       {virtualizer.getVirtualItems().map((virtualItem) => {
 *         const story = stories[virtualItem.index];
 *         return (
 *           <Box
 *             key={virtualItem.key}
 *             sx={{
 *               position: "absolute",
 *               top: 0,
 *               left: 0,
 *               width: "100%",
 *               height: `${virtualItem.size}px`,
 *               transform: `translateY(${virtualItem.start}px)`,
 *               padding: 1
 *             }}
 *           >
 *             <StoryCard story={story} />
 *           </Box>
 *         );
 *       })}
 *     </Box>
 *   </Box>
 * );
 */

