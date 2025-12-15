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
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            itp_support?: boolean;
            use_fedcm_for_prompt?: boolean;
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
  const { isAuthenticated, user, login, loginWithBypass, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      void navigate("/stories", { replace: true });
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
        void navigate("/stories", { replace: true });
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
      callback: (response) => {
        void handleGoogleSignIn(response);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true,
      use_fedcm_for_prompt: true
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
        void navigate("/stories", { replace: true });
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
      <>
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            background:
              "linear-gradient(180deg, hsla(160, 84%, 39%, 1) 0%, hsla(180, 94%, 31%, 1) 100%)",
            p: 3,
            pb: { xs: 20, md: 12 }
          }}
        >
          <Container
            maxWidth="sm"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexGrow: 1
            }}
          >
            <Typography>Loading...</Typography>
          </Container>
        </Box>
        <Box
          component="footer"
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            width: "100%",
            borderTop: "1px solid rgba(148, 163, 184, 0.25)",
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            backdropFilter: "blur(10px)"
          }}
        >
          <Box
            sx={{
              mx: "auto",
              width: "100%",
              maxWidth: 1280,
              py: 3,
              px: { xs: 3, md: 6 }
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: "rgba(226, 232, 240, 0.78)",
                  textAlign: "center"
                }}
              >
                © {new Date().getFullYear()} Yarny. Your personal writing tool.
              </Typography>
              <Box
                component="nav"
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  gap: { xs: 2, md: 3 },
                  flexWrap: "wrap",
                  justifyContent: "center"
                }}
              >
                <Box
                  component={RouterLink}
                  to="/docs"
                  sx={{
                    color: "rgba(34, 211, 238, 0.9)",
                    textDecoration: "none",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    transition: "color 0.2s ease",
                    "&:hover": {
                      color: "rgba(165, 243, 252, 0.95)"
                    }
                  }}
                >
                  User Guide
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </>
    );
  }

  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, hsla(160, 84%, 39%, 1) 0%, hsla(180, 94%, 31%, 1) 100%)",
          p: 3,
          pb: { xs: 20, md: 12 }
        }}
      >
        <Container
          maxWidth="sm"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexGrow: 1
          }}
        >
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
            <Box
              component={RouterLink}
              to={user ? "/stories" : "/login"}
              sx={{
                display: "inline-block",
                textDecoration: "none",
                mb: 2,
                "&:hover": {
                  opacity: 0.9
                }
              }}
            >
              <Box
                component="img"
                src="/yarny-wordmark-white.svg"
                alt="Yarny"
                sx={{
                  height: "3rem"
                }}
              />
            </Box>
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
      <Box
        component="footer"
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          borderTop: "1px solid rgba(148, 163, 184, 0.25)",
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          backdropFilter: "blur(10px)"
        }}
      >
        <Box
          sx={{
            mx: "auto",
            width: "100%",
            maxWidth: 1280,
            py: 3,
            px: { xs: 3, md: 6 }
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: "rgba(226, 232, 240, 0.78)",
                textAlign: "center"
              }}
            >
              © {new Date().getFullYear()} Yarny. Your personal writing tool.
            </Typography>
            <Box
              component="nav"
              sx={{
                display: "flex",
                flexDirection: "row",
                gap: { xs: 2, md: 3 },
                flexWrap: "wrap",
                justifyContent: "center"
              }}
            >
              <Box
                component={RouterLink}
                to="/docs"
                sx={{
                  color: "rgba(34, 211, 238, 0.9)",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  transition: "color 0.2s ease",
                  "&:hover": {
                    color: "rgba(165, 243, 252, 0.95)"
                  }
                }}
              >
                User Guide
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}


