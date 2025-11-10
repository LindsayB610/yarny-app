import { Alert, Box, Button, Container, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState, type JSX, type MouseEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

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
  const { isAuthenticated, login, loginWithBypass, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/stories", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const isLocalhost = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const hostname = window.location.hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  }, []);

  const localBypassInfo = config?.localBypass;
  const bypassActive = Boolean(localBypassInfo?.enabled && isLocalhost);
  const bypassDisplayName =
    localBypassInfo?.name ||
    localBypassInfo?.email ||
    "Local Dev User";

  useEffect(() => {
    if (bypassActive) {
      console.log("[Auth] Local bypass enabled for", bypassDisplayName);
    }
  }, [bypassActive, bypassDisplayName]);

  const handleGoogleSignIn = useCallback(
    async (response: { credential: string }) => {
      try {
        setError(null);
        await login(response.credential);
        navigate("/stories", { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
      }
    },
    [login, navigate]
  );

  // Initialize Google Sign-In
  useEffect(() => {
    if (bypassActive) {
      return;
    }

    if (!config?.clientId || !window.google) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: config.clientId,
      callback: handleGoogleSignIn
    });
  }, [bypassActive, config?.clientId, handleGoogleSignIn]);

  const resolveBypassSecret = useCallback(
    (forcePrompt: boolean) => {
      if (typeof window === "undefined") {
        return "";
      }

      const LOCAL_STORAGE_KEY = "yarny_local_bypass_secret";
      const existing = window.localStorage.getItem(LOCAL_STORAGE_KEY) ?? "";

      if (existing && !forcePrompt) {
        return existing.trim();
      }

      const promptMessage = "Enter the LOCAL_DEV_BYPASS_SECRET value from your local .env file.";
      const input = window.prompt(promptMessage, existing) ?? "";
      const secret = input.trim();

      if (secret) {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, secret);
      } else {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      }

      return secret;
    },
    []
  );

  const handleLocalBypass = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      const forcePrompt = event.altKey || event.metaKey || event.ctrlKey;
      const secret = resolveBypassSecret(forcePrompt);

      if (!secret) {
        setError("Local bypass secret is required. Hold Option/Alt while clicking to re-enter it.");
        return;
      }

      try {
        setError(null);
        await loginWithBypass(secret);
        navigate("/stories", { replace: true });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Authentication failed. Please try again."
        );
      }
    },
    [loginWithBypass, navigate, resolveBypassSecret]
  );

  const handleSignInClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (bypassActive) {
      void handleLocalBypass(event);
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setError("Google Sign-In not loaded. Please refresh the page.");
    }
  };

  // Load Google Sign-In script
  useEffect(() => {
    if (bypassActive) {
      return;
    }

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
  }, [bypassActive]);

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

          {bypassActive && (
            <Alert
              severity="success"
              sx={{ mb: 3, bgcolor: "rgba(16, 185, 129, 0.2)" }}
            >
              Local bypass active – continue as {bypassDisplayName}. Hold Option/Alt while clicking to re-enter the secret.
            </Alert>
          )}

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
            disabled={(!config?.clientId && !bypassActive) || isLoading}
            sx={{
              py: 1.5,
              borderRadius: "9999px",
              textTransform: "none",
              fontWeight: "bold",
              fontSize: "1rem"
            }}
          >
            {bypassActive ? `Continue as ${bypassDisplayName}` : "Sign in with Google"}
          </Button>

          <Box sx={{ mt: 4 }}>
          <Typography
            component={RouterLink}
            to="/docs"
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

