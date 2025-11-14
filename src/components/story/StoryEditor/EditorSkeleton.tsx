import { Box, Skeleton, Stack } from "@mui/material";
import type { JSX } from "react";

export function EditorSkeleton(): JSX.Element {
  return (
    <Stack spacing={3} sx={{ height: "100%" }}>
      {/* Header skeleton */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Box>
          <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={200} height={24} />
        </Box>
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={140} height={36} sx={{ borderRadius: 1 }} />
        </Stack>
      </Stack>

      {/* Editor content area skeleton */}
      <Box
        sx={{
          flex: 1,
          borderRadius: 3,
          backgroundColor: "#E9E9EB",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: "inset 0 2px 6px rgba(15, 23, 42, 0.04)",
          pt: { xs: 3, md: 6 },
          pb: { xs: 3, md: 6 },
          px: { xs: 3, md: 6 }
        }}
      >
        <Stack spacing={2} sx={{ maxWidth: "800px", width: "100%", mx: "auto" }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={index}
              variant="text"
              width={index % 3 === 0 ? "90%" : index % 3 === 1 ? "100%" : "75%"}
              height={24}
              sx={{
                bgcolor: "rgba(0, 0, 0, 0.05)"
              }}
            />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

