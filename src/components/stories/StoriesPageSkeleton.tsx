import { Box, Card, CardContent, Skeleton, useTheme, useMediaQuery } from "@mui/material";
import type { JSX } from "react";

export function StoriesPageSkeleton(): JSX.Element {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"));
  const isSm = useMediaQuery(theme.breakpoints.up("sm"));

  // Show 6 skeleton cards
  const skeletonCount = 6;

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
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <Card
          key={index}
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            border: "2px solid transparent",
            display: "flex",
            flexDirection: "column",
            minHeight: 200
          }}
        >
          <CardContent sx={{ flex: 1, pb: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Skeleton
                variant="text"
                width="70%"
                height={32}
                sx={{ bgcolor: "rgba(255, 255, 255, 0.2)" }}
              />
              <Skeleton
                variant="circular"
                width={24}
                height={24}
                sx={{ bgcolor: "rgba(255, 255, 255, 0.2)" }}
              />
            </Box>

            <Skeleton
              variant="text"
              width="50%"
              height={20}
              sx={{ bgcolor: "rgba(255, 255, 255, 0.15)", mb: 1 }}
            />

            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 0.5
                }}
              >
                <Skeleton
                  variant="text"
                  width="60%"
                  height={16}
                  sx={{ bgcolor: "rgba(255, 255, 255, 0.15)" }}
                />
              </Box>
              <Skeleton
                variant="rectangular"
                height={6}
                sx={{
                  borderRadius: 3,
                  bgcolor: "rgba(255, 255, 255, 0.1)"
                }}
              />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

