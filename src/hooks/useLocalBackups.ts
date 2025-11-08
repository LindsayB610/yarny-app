import { useCallback } from "react";

import {
  ensureDirectoryPermission,
  queryDirectoryPermission,
  requestDirectoryHandle,
  revokePersistedDirectory
} from "../services/localFs";
import { useLocalBackupStore, useLocalBackupStoreApi } from "../store/localBackupProvider";

export function useLocalBackups() {
  const {
    enabled,
    isSupported,
    isInitializing,
    permission,
    rootHandle,
    repository,
    error,
    lastSyncedAt
  } = useLocalBackupStore((state) => ({
    enabled: state.enabled,
    isSupported: state.isSupported,
    isInitializing: state.isInitializing,
    permission: state.permission,
    rootHandle: state.rootHandle,
    repository: state.repository,
    error: state.error,
    lastSyncedAt: state.lastSyncedAt
  }));

  const storeApi = useLocalBackupStoreApi();

  const createError = useCallback((message: string) => {
    return {
      message,
      timestamp: new Date().toISOString()
    };
  }, []);

  const enableLocalBackups = useCallback(async () => {
    const store = storeApi.getState();
    const handle = await requestDirectoryHandle();
    if (!handle) {
      store.setError(createError("Folder selection was cancelled or failed."));
      return { success: false as const };
    }

    const permissionState = await ensureDirectoryPermission(handle, "readwrite");
    store.setPermission(permissionState);

    if (permissionState !== "granted") {
      store.setRootHandle(null);
      store.setEnabled(false);
       store.setError(
        createError("Write permission was not granted for the selected folder.")
      );
      return { success: false as const };
    }

    store.setRootHandle(handle);
    store.setEnabled(true);
    store.setError(null);

    return { success: true as const };
  }, [createError, storeApi]);

  const disableLocalBackups = useCallback(async () => {
    const store = storeApi.getState();
    store.setEnabled(false);
    store.setRootHandle(null);
    store.setRepository(null);
    store.setPermission("prompt");
    store.setLastSyncedAt(null);
    store.setError(null);

    await revokePersistedDirectory();

    return { success: true as const };
  }, [storeApi]);

  const refreshPermission = useCallback(async () => {
    const store = storeApi.getState();
    const handle = store.rootHandle;
    if (!handle) {
      store.setPermission("prompt");
      return "prompt" as PermissionState;
    }

    const permissionState = await queryDirectoryPermission(handle, "readwrite");
    store.setPermission(permissionState);
    if (permissionState !== "granted") {
      store.setRepository(null);
      store.setEnabled(false);
      store.setError(
        createError(
          permissionState === "denied"
            ? "Local folder access was revoked."
            : "Local folder access requires attention."
        )
      );
    }
    return permissionState;
  }, [createError, storeApi]);

  const openLocalFolder = useCallback(async () => {
    if (typeof window === "undefined") {
      return { success: false as const };
    }

    const handle = storeApi.getState().rootHandle;
    if (!handle || typeof window.showDirectoryPicker !== "function") {
      return { success: false as const };
    }

    try {
      await window.showDirectoryPicker({
        mode: "read",
        startIn: handle
      });
      return { success: true as const };
    } catch (error) {
      if ((error as DOMException).name === "AbortError") {
        return { success: false as const };
      }
      console.warn("[useLocalBackups] openLocalFolder failed", error);
      storeApi.getState().setError(
        createError("Unable to open the selected folder. Please try again.")
      );
      return { success: false as const };
    }
  }, [createError, storeApi]);

  return {
    enabled,
    isSupported,
    isInitializing,
    permission,
    rootHandle,
    repository,
    error,
    lastSyncedAt,
    enableLocalBackups,
    disableLocalBackups,
    refreshPermission,
    openLocalFolder
  };
}


