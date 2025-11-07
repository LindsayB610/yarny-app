import { Alert, Box, Button, Container, Typography } from "@mui/material";
import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth, useAuthConfig } from "../../hooks/useAuth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { data: config, isLoading: configLoading } = useAuthConfig();
  const { user, isAuthenticated, login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/stories", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!config?.clientId || !window.google) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: config.clientId,
      callback: handleGoogleSignIn
    });
  }, [config?.clientId]);

  const handleGoogleSignIn = async (response: { credential: string }) => {
    try {
      setError(null);
      await login(response.credential);
      navigate("/stories", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    }
  };

  const handleSignInClick = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setError("Google Sign-In not loaded. Please refresh the page.");
    }
  };

  // Load Google Sign-In script
  useEffect(() => {
    if (window.google?.accounts) {
      return; // Already loaded
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  if (configLoading) {
    return (
      <Container
        maxWidth="sm"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh"
        }}
      >
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, hsla(160, 84%, 39%, 1) 0%, hsla(180, 94%, 31%, 1) 100%)",
        p: 3
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            bgcolor: "rgba(31, 41, 55, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: 3,
            p: 6,
            textAlign: "center",
            boxShadow: 6
          }}
        >
          <Typography variant="h3" sx={{ color: "primary.main", mb: 2, fontWeight: "bold" }}>
            Yarny
          </Typography>
          <Typography variant="h5" sx={{ color: "white", mb: 1, fontWeight: "bold" }}>
            Welcome back!
          </Typography>
          <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.7)", mb: 4 }}>
            Sign in to continue writing
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: "rgba(239, 68, 68, 0.2)" }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleSignInClick}
            disabled={!config?.clientId}
            sx={{
              py: 1.5,
              borderRadius: "9999px",
              textTransform: "none",
              fontWeight: "bold",
              fontSize: "1rem"
            }}
          >
            Sign in with Google
          </Button>

          <Box sx={{ mt: 4 }}>
            <Typography
              component="a"
              href="/docs.html"
              sx={{
                color: "primary.main",
                textDecoration: "underline",
                fontSize: "0.875rem",
                "&:hover": {
                  color: "primary.dark"
                }
              }}
            >
              View Docs
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

