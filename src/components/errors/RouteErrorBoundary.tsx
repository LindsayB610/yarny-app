import { useRouteError, isRouteErrorResponse, Link, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Container, Typography } from "@mui/material";
import type { JSX } from "react";

export function RouteErrorBoundary(): JSX.Element {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = "An unexpected error occurred";
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || (error.data as { message?: string })?.message || errorMessage;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
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
          <Button
            variant="outlined"
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload Page
          </Button>
        </Box>
      </Alert>
    </Container>
  );
}

