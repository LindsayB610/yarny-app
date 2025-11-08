import { clearDirectoryHandle, loadDirectoryHandle, storeDirectoryHandle } from "./LocalHandleStorage";

type PermissionMode = FileSystemPermissionMode | "read" | "readwrite";

const isBrowser = typeof window !== "undefined";

const hasFileSystemAccessApi = (): boolean => {
  return (
    isBrowser &&
    typeof window.showDirectoryPicker === "function" &&
    typeof navigator !== "undefined" &&
    "storage" in navigator
  );
};

export function isFileSystemAccessSupported(): boolean {
  return hasFileSystemAccessApi();
}

async function requestStoragePersistence(): Promise<void> {
  if (!isBrowser || !("storage" in navigator) || typeof navigator.storage.persist !== "function") {
    return;
  }

  try {
    const hasPersisted = await navigator.storage.persisted?.();
    if (!hasPersisted) {
      await navigator.storage.persist();
    }
  } catch (error) {
    console.warn("[LocalFsCapability] Failed to request persistent storage", error);
  }
}

export async function requestDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!hasFileSystemAccessApi()) {
    return null;
  }

  try {
    const handle = await window.showDirectoryPicker({
      mode: "readwrite",
      id: "yarny-local-backups"
    });

    await requestStoragePersistence();
    await storeDirectoryHandle(handle);
    return handle;
  } catch (error) {
    if ((error as DOMException).name === "AbortError") {
      return null;
    }
    console.warn("[LocalFsCapability] Failed to pick directory", error);
    return null;
  }
}

export async function getPersistedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!hasFileSystemAccessApi()) {
    return null;
  }

  const handle = await loadDirectoryHandle();
  if (!handle) {
    return null;
  }

  const permission = await queryDirectoryPermission(handle, "readwrite");
  if (permission !== "granted") {
    return null;
  }

  return handle;
}

export async function queryDirectoryPermission(
  handle: FileSystemDirectoryHandle | null | undefined,
  mode: PermissionMode = "readwrite"
): Promise<PermissionState> {
  if (!handle || typeof handle.queryPermission !== "function") {
    return "denied";
  }

  try {
    return await handle.queryPermission({ mode });
  } catch (error) {
    console.warn("[LocalFsCapability] queryPermission failed", error);
    return "denied";
  }
}

export async function ensureDirectoryPermission(
  handle: FileSystemDirectoryHandle | null | undefined,
  mode: PermissionMode = "readwrite"
): Promise<PermissionState> {
  if (!handle || typeof handle.requestPermission !== "function") {
    return "denied";
  }

  try {
    const status = await handle.queryPermission({ mode });
    if (status === "granted") {
      return status;
    }
    if (status === "denied") {
      return status;
    }
    return handle.requestPermission({ mode });
  } catch (error) {
    console.warn("[LocalFsCapability] requestPermission failed", error);
    return "denied";
  }
}

export async function revokePersistedDirectory(): Promise<void> {
  await clearDirectoryHandle();
}


