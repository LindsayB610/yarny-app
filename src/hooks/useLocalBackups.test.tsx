import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { LocalBackupProvider } from "../store/localBackupProvider";
import { useLocalBackups } from "./useLocalBackups";
import { localBackupStore } from "../store/localBackupStore";

// Mock dependencies
const localFsMocks = vi.hoisted(() => ({
  requestDirectoryHandle: vi.fn<() => Promise<FileSystemDirectoryHandle | null>>(),
  ensureDirectoryPermission: vi.fn<() => Promise<PermissionState>>(),
  queryDirectoryPermission: vi.fn<() => Promise<PermissionState>>(),
  revokePersistedDirectory: vi.fn<() => Promise<void>>()
}));

vi.mock("../services/localFs", async () => {
  const actual = await vi.importActual("../services/localFs");
  return {
    ...(actual as Record<string, unknown>),
    requestDirectoryHandle: localFsMocks.requestDirectoryHandle,
    ensureDirectoryPermission: localFsMocks.ensureDirectoryPermission,
    queryDirectoryPermission: localFsMocks.queryDirectoryPermission,
    revokePersistedDirectory: localFsMocks.revokePersistedDirectory
  };
});

describe("useLocalBackups", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <LocalBackupProvider>{children}</LocalBackupProvider>
  );

  beforeEach(() => {
    localBackupStore.getState().reset();
    window.localStorage.clear();
    localFsMocks.requestDirectoryHandle.mockReset();
    localFsMocks.ensureDirectoryPermission.mockReset();
    localFsMocks.queryDirectoryPermission.mockReset();
    localFsMocks.revokePersistedDirectory.mockReset();
  });

  afterEach(() => {
    localBackupStore.getState().reset();
    vi.restoreAllMocks();
  });

  it("returns initial state from store", () => {
    const { result } = renderHook(() => useLocalBackups(), { wrapper });

    expect(result.current.enabled).toBe(false);
    expect(result.current.permission).toBe("prompt");
    expect(result.current.rootHandle).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("enables local backups successfully", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    localFsMocks.requestDirectoryHandle.mockResolvedValue(mockHandle);
    localFsMocks.ensureDirectoryPermission.mockResolvedValue("granted");

    const { result } = renderHook(() => useLocalBackups(), { wrapper });

    const enableResult = await result.current.enableLocalBackups();

    expect(enableResult.success).toBe(true);
    expect(localFsMocks.requestDirectoryHandle).toHaveBeenCalled();
    expect(localFsMocks.ensureDirectoryPermission).toHaveBeenCalledWith(mockHandle, "readwrite");
    
    await waitFor(() => {
      expect(localBackupStore.getState().enabled).toBe(true);
      expect(localBackupStore.getState().rootHandle).toBe(mockHandle);
    });
  });

  it("handles cancelled folder selection", async () => {
    localFsMocks.requestDirectoryHandle.mockResolvedValue(null);

    const { result } = renderHook(() => useLocalBackups(), { wrapper });

    const enableResult = await result.current.enableLocalBackups();

    expect(enableResult.success).toBe(false);
    await waitFor(() => {
      const error = localBackupStore.getState().error;
      expect(error?.message).toBe("Folder selection was cancelled or failed.");
    });
  });

  it("handles permission denied", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    localFsMocks.requestDirectoryHandle.mockResolvedValue(mockHandle);
    localFsMocks.ensureDirectoryPermission.mockResolvedValue("denied");

    const { result } = renderHook(() => useLocalBackups(), { wrapper });

    const enableResult = await result.current.enableLocalBackups();

    expect(enableResult.success).toBe(false);
    await waitFor(() => {
      const state = localBackupStore.getState();
      expect(state.rootHandle).toBeNull();
      expect(state.error?.message).toBe("Write permission was not granted for the selected folder.");
    });
  });

  it("disables local backups successfully", async () => {
    localFsMocks.revokePersistedDirectory.mockResolvedValue();

    const { result } = renderHook(() => useLocalBackups(), { wrapper });

    const disableResult = await result.current.disableLocalBackups();

    expect(disableResult.success).toBe(true);
    expect(localFsMocks.revokePersistedDirectory).toHaveBeenCalled();
    
    await waitFor(() => {
      const state = localBackupStore.getState();
      expect(state.enabled).toBe(false);
      expect(state.rootHandle).toBeNull();
      expect(state.repository).toBeNull();
      expect(state.permission).toBe("prompt");
      expect(state.lastSyncedAt).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  it("refreshes permission when handle exists", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    localBackupStore.getState().setRootHandle(mockHandle);
    localFsMocks.queryDirectoryPermission.mockResolvedValue("granted");

    const { result } = renderHook(() => useLocalBackups(), { wrapper });

    const permission = await result.current.refreshPermission();

    expect(permission).toBe("granted");
    expect(localFsMocks.queryDirectoryPermission).toHaveBeenCalledWith(mockHandle, "readwrite");
    
    await waitFor(() => {
      expect(localBackupStore.getState().permission).toBe("granted");
    });
  });

  it("handles permission refresh when handle doesn't exist", async () => {
    const { result } = renderHook(() => useLocalBackups(), { wrapper });

    const permission = await result.current.refreshPermission();

    expect(permission).toBe("prompt");
    expect(localBackupStore.getState().permission).toBe("prompt");
  });

  it("handles denied permission on refresh", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    localBackupStore.getState().setRootHandle(mockHandle);
    localFsMocks.queryDirectoryPermission.mockResolvedValue("denied");

    const { result } = renderHook(() => useLocalBackups(), { wrapper });

    await result.current.refreshPermission();

    await waitFor(() => {
      const state = localBackupStore.getState();
      expect(state.repository).toBeNull();
      expect(state.error?.message).toBe("Local folder access was revoked.");
    });
  });

  it("opens local folder successfully", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    localBackupStore.getState().setRootHandle(mockHandle);

    const mockShowDirectoryPicker = vi.fn().mockResolvedValue({});
    Object.defineProperty(window, "showDirectoryPicker", {
      writable: true,
      configurable: true,
      value: mockShowDirectoryPicker
    });

    const { result } = renderHook(() => useLocalBackups(), { wrapper });

    const openResult = await result.current.openLocalFolder();

    expect(openResult.success).toBe(true);
    expect(mockShowDirectoryPicker).toHaveBeenCalledWith({
      mode: "read",
      startIn: mockHandle
    });
  });

  it("handles missing showDirectoryPicker", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    localBackupStore.getState().setRootHandle(mockHandle);

    Object.defineProperty(window, "showDirectoryPicker", {
      writable: true,
      configurable: true,
      value: undefined
    });

    const { result } = renderHook(() => useLocalBackups(), { wrapper });

    const openResult = await result.current.openLocalFolder();

    expect(openResult.success).toBe(false);
  });

  it("handles cancelled folder picker", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    localBackupStore.getState().setRootHandle(mockHandle);

    const abortError = new DOMException("User cancelled", "AbortError");
    const mockShowDirectoryPicker = vi.fn().mockRejectedValue(abortError);
    Object.defineProperty(window, "showDirectoryPicker", {
      writable: true,
      configurable: true,
      value: mockShowDirectoryPicker
    });

    const { result } = renderHook(() => useLocalBackups(), { wrapper });

    const openResult = await result.current.openLocalFolder();

    expect(openResult.success).toBe(false);
  });

  it("handles folder picker errors", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    localBackupStore.getState().setRootHandle(mockHandle);

    const error = new Error("Permission denied");
    const mockShowDirectoryPicker = vi.fn().mockRejectedValue(error);
    Object.defineProperty(window, "showDirectoryPicker", {
      writable: true,
      configurable: true,
      value: mockShowDirectoryPicker
    });

    const { result } = renderHook(() => useLocalBackups(), { wrapper });

    const openResult = await result.current.openLocalFolder();

    expect(openResult.success).toBe(false);
    await waitFor(() => {
      const state = localBackupStore.getState();
      expect(state.error?.message).toBe("Unable to open the selected folder. Please try again.");
    });
  });

  it("sets refresh status", () => {
    const { result } = renderHook(() => useLocalBackups(), { wrapper });

    result.current.setRefreshStatus("running", "Syncing files...");

    const state = localBackupStore.getState();
    expect(state.refreshStatus).toBe("running");
    expect(state.refreshMessage).toBe("Syncing files...");
  });
});

