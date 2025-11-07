import { Box, useVirtualizer } from "@tanstack/react-virtual";
import { useRef, type JSX } from "react";

import type { StoryFolder } from "../../hooks/useStoriesQuery";
import { StoryCard } from "./StoryCard";

interface VirtualizedStoryListProps {
  stories: StoryFolder[];
}

/**
 * Virtualized story list component
 * This is a scaffold/stub for future virtualization implementation.
 * Currently renders a regular grid, but structure is ready for virtualization.
 *
 * When performance requires it, we can:
 * 1. Replace the Grid with a virtual list using @tanstack/react-virtual
 * 2. Measure story card heights for proper virtualization
 * 3. Implement dynamic row heights if needed
 */
export function VirtualizedStoryList({
  stories
}: VirtualizedStoryListProps): JSX.Element {
  // Stub: Virtualization infrastructure ready but not yet active
  // This component structure allows us to easily switch to virtualization later
  const parentRef = useRef<HTMLDivElement>(null);

  // TODO: When implementing virtualization, uncomment and configure:
  // const virtualizer = useVirtualizer({
  //   count: stories.length,
  //   getScrollElement: () => parentRef.current,
  //   estimateSize: () => 220, // Estimated height of a story card
  //   overscan: 5
  // });

  // For now, render as a regular grid
  // When virtualization is needed, replace with virtualized rendering
  return (
    <Box
      ref={parentRef}
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 2
      }}
    >
      {stories.map((story) => (
        <StoryCard key={story.id} story={story} />
      ))}
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

