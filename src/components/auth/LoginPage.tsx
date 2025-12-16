import { Alert, Box, Button, Container, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState, type JSX, type MouseEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { AppFooter } from "../layout/AppFooter";

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
          prompt: (notificationCallback?: (notification: {
            isNotDisplayed?: boolean;
            notDisplayedReason?: string;
            isSkippedMoment?: boolean;
            isDismissedMoment?: boolean;
          }) => void) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              shape?: string;
              logo_alignment?: string;
              width?: number;
            }
          ) => void;
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
  const isPromptingRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const googleButtonContainerRef = useRef<HTMLDivElement>(null);
  const oneTapShownRef = useRef(false);

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

  const handleGoogleSignInRef = useRef<(response: { credential: string }) => Promise<void>>();
  
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

  // Keep ref updated
  handleGoogleSignInRef.current = handleGoogleSignIn;

  // Initialize Google Sign-In - only once per clientId
  useEffect(() => {
    if (bypassActive) {
      return;
    }

    if (!config?.clientId) {
      return;
    }

    // Wait for Google script to load
    const checkAndInit = () => {
      if (!window.google?.accounts?.id) {
        console.log("[Auth] Waiting for Google Sign-In script to load...");
        setTimeout(checkAndInit, 100);
        return;
      }

      console.log("[Auth] Initializing Google Sign-In with clientId:", config.clientId.substring(0, 10) + "...");
      
      try {
        window.google.accounts.id.initialize({
          client_id: config.clientId,
          callback: (response) => {
            console.log("[Auth] Google Sign-In callback received");
            if (handleGoogleSignInRef.current) {
              void handleGoogleSignInRef.current(response);
            }
          },
          // Enable One Tap UI (the corner account picker)
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
          use_fedcm_for_prompt: true
        });
        console.log("[Auth] Google Sign-In initialized successfully");
        
        // Render Google button overlay once during initialization
        // This matches the legacy approach that worked well
        const setupButtonOverlay = () => {
          if (!buttonRef.current) {
            setTimeout(setupButtonOverlay, 100);
            return;
          }

          // Create container for Google button overlay
          if (!googleButtonContainerRef.current && buttonRef.current.parentElement) {
            const container = document.createElement("div");
            container.style.position = "absolute";
            container.style.top = "0";
            container.style.left = "0";
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.opacity = "0";
            container.style.pointerEvents = "auto";
            container.style.zIndex = "1";
            container.style.cursor = "pointer";
            container.style.overflow = "hidden";
            
            const parent = buttonRef.current.parentElement;
            parent.style.position = "relative";
            parent.appendChild(container);
            googleButtonContainerRef.current = container;
          }

          // Render Google button into container
          if (googleButtonContainerRef.current && !googleButtonContainerRef.current.querySelector("iframe")) {
            const rect = buttonRef.current.getBoundingClientRect();
            try {
              window.google.accounts.id.renderButton(googleButtonContainerRef.current, {
                type: "standard",
                theme: "outline",
                size: "large",
                text: "signin_with",
                shape: "rectangular",
                logo_alignment: "left",
                width: rect.width
              });
              console.log("[Auth] Google Sign-In button overlay rendered");
            } catch (err) {
              console.error("[Auth] Error rendering Google button:", err);
            }
          }
        };

        // Setup button overlay after a short delay to ensure button is mounted
        setTimeout(setupButtonOverlay, 100);
      } catch (err) {
        console.error("[Auth] Failed to initialize Google Sign-In:", err);
        setError("Failed to initialize Google Sign-In. Please refresh the page.");
      }
    };

    checkAndInit();
  }, [bypassActive, config?.clientId]);


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

    // The Google button overlay should be positioned over our custom button
    // If the overlay exists, clicks should naturally go to it
    // We just need to ensure the click propagates to the overlay
    const container = googleButtonContainerRef.current;
    
    if (container) {
      // Check if button is rendered
      const iframe = container.querySelector("iframe");
      const button = container.querySelector("div[role='button']");
      
      if (iframe || button) {
        // Button is rendered - let the click pass through naturally
        // The overlay is positioned over our button, so clicks should work
        console.log("[Auth] Google button overlay exists, click should pass through");
        return; // Let the natural click event handle it
      } else {
        // Button not rendered yet - try prompt() as fallback
        console.log("[Auth] Google button not rendered yet, trying prompt()");
        if (window.google?.accounts?.id) {
          try {
            window.google.accounts.id.prompt();
          } catch (err) {
            console.error("[Auth] Error calling prompt():", err);
            setError("Sign-in not ready. Please wait a moment and try again.");
          }
        }
      }
    } else {
      // No overlay - try prompt() as fallback
      console.log("[Auth] Google button overlay not found, trying prompt()");
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.prompt();
        } catch (err) {
          console.error("[Auth] Error calling prompt():", err);
          setError("Google Sign-In not ready. Please refresh the page.");
        }
      } else {
        setError("Google Sign-In not loaded. Please wait a moment and try again.");
      }
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

            <Box sx={{ position: "relative", width: "100%" }}>
              <Button
                ref={buttonRef}
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
            </Box>

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
              <Box
                component="a"
                href="https://lindsaybrunner.com"
                target="_blank"
                rel="noopener noreferrer"
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
                lindsaybrunner.com
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}


