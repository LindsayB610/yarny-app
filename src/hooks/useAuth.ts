import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { apiClient } from "../api/client";
import type {
  ConfigResponse,
  VerifyGoogleResponse
} from "../api/contract";

export interface AuthUser {
  email: string;
  name?: string;
  picture?: string;
  token: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Validate AuthUser from unknown data
function validateAuthUser(data: unknown): AuthUser | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const obj = data as Record<string, unknown>;
  if (
    typeof obj.email === "string" &&
    typeof obj.token === "string" &&
    (obj.name === undefined || typeof obj.name === "string") &&
    (obj.picture === undefined || typeof obj.picture === "string")
  ) {
    return {
      email: obj.email,
      token: obj.token,
      name: typeof obj.name === "string" ? obj.name : undefined,
      picture: typeof obj.picture === "string" ? obj.picture : undefined
    };
  }

  return null;
}

// Check if user is authenticated by looking for session token
function checkAuthFromStorage(): AuthUser | null {
  try {
    const authToken = localStorage.getItem("yarny_auth");
    const userData = localStorage.getItem("yarny_user");

    if (authToken && userData) {
      const parsed: unknown = JSON.parse(userData);
      return validateAuthUser(parsed);
    }
  } catch (error) {
    console.error("Error reading auth from storage:", error);
  }
  return null;
}

const FALLBACK_CONFIG: ConfigResponse = {
  clientId: ""
};

export function useAuthConfig() {
  return useQuery({
    queryKey: ["auth", "config"],
    queryFn: async () => {
      try {
        return await apiClient.getConfig();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(
            "[Auth] Config endpoint unavailable in development, using fallback config.",
            error
          );
          return FALLBACK_CONFIG;
        }
        throw error;
      }
    },
    staleTime: Infinity, // Config doesn't change often
    retry: import.meta.env.DEV ? false : undefined
  });
}

export function useAuth(): AuthState & {
  login: (token: string) => Promise<VerifyGoogleResponse>;
  loginWithBypass: (secret: string) => Promise<VerifyGoogleResponse>;
  logout: () => Promise<void>;
} {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(() => checkAuthFromStorage());

  const handleAuthSuccess = (data: VerifyGoogleResponse) => {
    const authUser: AuthUser = {
      email: data.user,
      name: data.name,
      picture: data.picture,
      token: data.token
    };
    setUser(authUser);
    localStorage.setItem("yarny_auth", authUser.token);
    localStorage.setItem("yarny_user", JSON.stringify(authUser));
  };

  const verifyMutation = useMutation({
    mutationFn: (token: string) => apiClient.verifyGoogle({ token }),
    onSuccess: handleAuthSuccess
  });

  const bypassMutation = useMutation({
    mutationFn: (secret: string) =>
      apiClient.verifyGoogle({
        mode: "local-bypass",
        secret
      }),
    onSuccess: handleAuthSuccess
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      setUser(null);
      localStorage.removeItem("yarny_auth");
      localStorage.removeItem("yarny_user");
      queryClient.clear();
    }
  });

  // Check auth status on mount and window focus
  useEffect(() => {
    const storedUser = checkAuthFromStorage();
    if (storedUser) {
      setUser(storedUser);
    }

    const handleFocus = () => {
      const currentUser = checkAuthFromStorage();
      if (currentUser?.token !== user?.token) {
        setUser(currentUser);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user?.token]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading:
      verifyMutation.isPending ||
      bypassMutation.isPending ||
      logoutMutation.isPending,
    login: (token: string) => verifyMutation.mutateAsync(token),
    loginWithBypass: (secret: string) => bypassMutation.mutateAsync(secret),
    logout: () => logoutMutation.mutateAsync()
  };
}

