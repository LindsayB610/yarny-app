import type { JSX, PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useRef } from "react";
import { useStore } from "zustand";

import {
  localBackupStore,
  type LocalBackupStore,
  type LocalBackupStoreApi
} from "./localBackupStore";
import {
  createLocalFsRepository,
  getPersistedDirectoryHandle,
  isFileSystemAccessSupported,
  queryDirectoryPermission
} from "../services/localFs";

const ENABLED_STORAGE_KEY = "yarny_local_backups_enabled_v1";

const LocalBackupStoreContext = createContext<LocalBackupStoreApi | null>(null);

const readEnabledPreference = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw = window.localStorage.getItem(ENABLED_STORAGE_KEY);
    return raw === "true";
  } catch (error) {
    console.warn("[LocalBackupProvider] Failed to read enabled preference", error);
    return false;
  }
};

const writeEnabledPreference = (enabled: boolean): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(ENABLED_STORAGE_KEY, enabled ? "true" : "false");
  } catch (error) {
    console.warn("[LocalBackupProvider] Failed to store enabled preference", error);
  }
};

export function LocalBackupProvider({ children }: PropsWithChildren): JSX.Element {
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) {
      return;
    }
    initRef.current = true;

    const store = localBackupStore;
    const {
      setSupported,
      setInitializing,
      setRootHandle,
      setPermission,
      setEnabled
    } = store.getState();

    const initialize = async () => {
      const supported = isFileSystemAccessSupported();
      setSupported(supported);

      const preference = readEnabledPreference();
      setEnabled(preference);

      if (!supported) {
        setInitializing(false);
        return;
      }

      const handle = await getPersistedDirectoryHandle();
      if (handle) {
        setRootHandle(handle);
        const permission = await queryDirectoryPermission(handle, "readwrite");
        setPermission(permission);
      } else if (preference) {
        setPermission("prompt");
      }

      setInitializing(false);
    };

    void initialize();
  }, []);

  useEffect(() => {
    const store = localBackupStore;

    const unsubscribe = store.subscribe(
      (state) => state.enabled,
      (enabled) => {
        writeEnabledPreference(enabled);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const store = localBackupStore;

    const unsubscribe = store.subscribe(
      (state) => state.rootHandle,
      async (handle) => {
        const { setRepository, setPermission } = store.getState();

        if (!handle) {
          setRepository(null);
          setPermission("prompt");
          return;
        }

        const permission = await queryDirectoryPermission(handle, "readwrite");
        setPermission(permission);

        if (permission !== "granted") {
          setRepository(null);
          return;
        }

        const repository = await createLocalFsRepository(handle);
        setRepository(repository);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <LocalBackupStoreContext.Provider value={localBackupStore}>
      {children}
    </LocalBackupStoreContext.Provider>
  );
}

export function useLocalBackupStore<T>(
  selector: (state: LocalBackupStore) => T,
  equalityFn?: (left: T, right: T) => boolean
): T {
  const store = useContext(LocalBackupStoreContext);

  if (!store) {
    throw new Error("useLocalBackupStore must be used within a LocalBackupProvider");
  }

  return useStore(store, selector, equalityFn);
}

export function useLocalBackupStoreApi(): LocalBackupStoreApi {
  const store = useContext(LocalBackupStoreContext);

  if (!store) {
    throw new Error("useLocalBackupStoreApi must be used within a LocalBackupProvider");
  }

  return store;
}


