import { immer } from "zustand/middleware/immer";
import { createStore } from "zustand/vanilla";

import type { LocalFsRepository } from "../services/localFs";

export interface LocalBackupError {
  code?: string;
  message: string;
  timestamp: string;
}

export interface LocalBackupState {
  isSupported: boolean;
  isInitializing: boolean;
  enabled: boolean;
  permission: PermissionState;
  rootHandle: FileSystemDirectoryHandle | null;
  repository: LocalFsRepository | null;
  lastSyncedAt: string | null;
  error: LocalBackupError | null;
  refreshStatus: "idle" | "running" | "success" | "error";
  refreshMessage: string | null;
  refreshCompletedAt: string | null;
}

export interface LocalBackupActions {
  setSupported: (supported: boolean) => void;
  setInitializing: (initializing: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  setPermission: (permission: PermissionState) => void;
  setRootHandle: (handle: FileSystemDirectoryHandle | null) => void;
  setRepository: (repository: LocalFsRepository | null) => void;
  setLastSyncedAt: (iso: string | null) => void;
  setError: (error: LocalBackupError | null) => void;
  setRefreshStatus: (
    status: "idle" | "running" | "success" | "error",
    message?: string | null
  ) => void;
  clearRefreshStatus: () => void;
  reset: () => void;
}

const createDefaultState = (): LocalBackupState => ({
  isSupported: false,
  isInitializing: true,
  enabled: false,
  permission: "prompt",
  rootHandle: null,
  repository: null,
  lastSyncedAt: null,
  error: null,
  refreshStatus: "idle",
  refreshMessage: null,
  refreshCompletedAt: null
});

export type LocalBackupStore = LocalBackupState & LocalBackupActions;

export const createLocalBackupStore = (initial?: Partial<LocalBackupState>) => {
  const baseState = {
    ...createDefaultState(),
    ...initial
  };

  return createStore<LocalBackupStore>()(
    immer((set) => ({
      ...baseState,
      setSupported(supported) {
        set((draft) => {
          draft.isSupported = supported;
        });
      },
      setInitializing(initializing) {
        set((draft) => {
          draft.isInitializing = initializing;
        });
      },
      setEnabled(enabled) {
        set((draft) => {
          draft.enabled = enabled;
        });
      },
      setPermission(permission) {
        set((draft) => {
          draft.permission = permission;
        });
      },
      setRootHandle(handle) {
        set((draft) => {
          draft.rootHandle = handle;
        });
      },
      setRepository(repository) {
        set((draft) => {
          draft.repository = repository;
        });
      },
      setLastSyncedAt(iso) {
        set((draft) => {
          draft.lastSyncedAt = iso;
        });
      },
      setError(error) {
        set((draft) => {
          draft.error = error;
        });
      },
      setRefreshStatus(status, message = null) {
        set((draft) => {
          draft.refreshStatus = status;
          draft.refreshMessage = message;
          if (status === "success") {
            draft.refreshCompletedAt = new Date().toISOString();
          }
          if (status === "idle") {
            draft.refreshMessage = null;
          }
        });
      },
      clearRefreshStatus() {
        set((draft) => {
          draft.refreshStatus = "idle";
          draft.refreshMessage = null;
        });
      },
      reset() {
        set(() => createDefaultState());
      }
    }))
  );
};

export type LocalBackupStoreApi = ReturnType<typeof createLocalBackupStore>;

export const localBackupStore = createLocalBackupStore();



