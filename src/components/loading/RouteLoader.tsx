import { CircularProgress, Container, Typography } from "@mui/material";
import type { JSX } from "react";

export function RouteLoader(): JSX.Element {
  return (
    <Container
      maxWidth="md"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        gap: 2
      }}
    >
      <CircularProgress size={48} />
      <Typography variant="body1" color="text.secondary">
        Loading...
      </Typography>
    </Container>
  );
}

