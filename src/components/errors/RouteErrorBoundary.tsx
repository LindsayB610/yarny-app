import { Box, Button, Container, Typography } from "@mui/material";
import { useEffect, useMemo, type JSX } from "react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

const reloadFlagKey = "yarny_chunk_reload_attempted";

function getReloadFlag(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(reloadFlagKey);
  } catch {
    return null;
  }
}

function setReloadFlag(value: "true" | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (value === null) {
      window.sessionStorage.removeItem(reloadFlagKey);
    } else {
      window.sessionStorage.setItem(reloadFlagKey, value);
    }
  } catch {
    // Ignore storage access errors (e.g. privacy mode)
  }
}

export function RouteErrorBoundary(): JSX.Element {
  const error = useRouteError();

  let errorMessage = "An unexpected error occurred";
  let errorStatus = 500;

  const isChunkLoadError = useMemo(() => {
    if (!(error instanceof Error)) {
      return false;
    }
    const message = error.message ?? "";
    return (
      message.includes("Failed to fetch dynamically imported module") ||
      message.includes("ChunkLoadError")
    );
  }, [error]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!isChunkLoadError) {
      setReloadFlag(null);
      return;
    }

    const alreadyAttempted = getReloadFlag();
    if (alreadyAttempted === "true") {
      return;
    }

    setReloadFlag("true");

    const url = new URL(window.location.href);
    url.searchParams.set("chunk-refresh", Date.now().toString());

    // Use replace so the busted URL does not stay in the history stack.
    window.location.replace(url.toString());
  }, [isChunkLoadError]);

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || (error.data as { message?: string })?.message || errorMessage;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  const handleReloadClick = (): void => {
    if (typeof window === "undefined") {
      return;
    }

    if (isChunkLoadError) {
      setReloadFlag(null);
      const url = new URL(window.location.href);
      url.searchParams.set("chunk-refresh", Date.now().toString());
      window.location.replace(url.toString());
      return;
    }

    window.location.reload();
  };

  if (isChunkLoadError) {
    errorMessage =
      "We published an update and need to refresh your session to load the latest code. We're reloading the page now—if this message keeps appearing, clear your browser cache or try an incognito window.";
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Alert severity={errorStatus >= 500 ? "error" : "warning"} sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {errorStatus === 404 ? "Page Not Found" : "Something went wrong"}
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          {errorMessage}
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button component={Link} to="/" variant="contained">
            Go to Home
          </Button>
          <Button variant="outlined" onClick={handleReloadClick}>
            Reload Page
          </Button>
        </Box>
      </Alert>
    </Container>
  );
}

