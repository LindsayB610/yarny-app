import { del, get, set } from "idb-keyval";

const STORAGE_KEY = "yarny_local_root_handle_v1";

const isBrowser = typeof window !== "undefined";

const supportsStructuredClone = (): boolean => {
  if (!isBrowser) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof window.structuredClone === "function") {
    try {
      const testMap = new Map();
      window.structuredClone(testMap);
      return true;
    } catch {
      return false;
    }
  }

  return false;
};

export async function storeDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  if (!isBrowser || !supportsStructuredClone()) {
    return;
  }

  try {
    await set(STORAGE_KEY, handle);
  } catch (error) {
    console.warn("[LocalHandleStorage] Failed to persist directory handle", error);
  }
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!isBrowser || !supportsStructuredClone()) {
    return null;
  }

  try {
    const handle = (await get(STORAGE_KEY)) as FileSystemDirectoryHandle | undefined;
    if (!handle) {
      return null;
    }
    return handle;
  } catch (error) {
    console.warn("[LocalHandleStorage] Failed to load directory handle", error);
    return null;
  }
}

export async function clearDirectoryHandle(): Promise<void> {
  if (!isBrowser) {
    return;
  }

  try {
    await del(STORAGE_KEY);
  } catch (error) {
    console.warn("[LocalHandleStorage] Failed to clear stored directory handle", error);
  }
}


