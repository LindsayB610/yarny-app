import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

const localFsMocks = vi.hoisted(() => ({
  isFileSystemAccessSupported: vi.fn<() => boolean>(),
  getPersistedDirectoryHandle: vi.fn<() => Promise<FileSystemDirectoryHandle | null>>(),
  queryDirectoryPermission: vi.fn<
    () => Promise<PermissionState>
  >(),
  createLocalFsRepository: vi.fn()
}));

vi.mock("../services/localFs", async () => {
  const actual = await vi.importActual("../services/localFs");
  return {
    ...(actual as Record<string, unknown>),
    isFileSystemAccessSupported: localFsMocks.isFileSystemAccessSupported,
    getPersistedDirectoryHandle: localFsMocks.getPersistedDirectoryHandle,
    queryDirectoryPermission: localFsMocks.queryDirectoryPermission,
    createLocalFsRepository: localFsMocks.createLocalFsRepository
  };
});

import { LocalBackupProvider } from "./localBackupProvider";
import { localBackupStore } from "./localBackupStore";

describe("LocalBackupProvider", () => {
  beforeEach(() => {
    localBackupStore.getState().reset();
    window.localStorage.clear();
    localFsMocks.isFileSystemAccessSupported.mockReset();
    localFsMocks.getPersistedDirectoryHandle.mockReset();
    localFsMocks.queryDirectoryPermission.mockReset();
    localFsMocks.createLocalFsRepository.mockReset();
  });

  afterEach(() => {
    cleanup();
    localBackupStore.getState().reset();
  });

  it("retains enabled preference when persisted directory handle is unavailable", async () => {
    window.localStorage.setItem("yarny_local_backups_enabled_v1", "true");

    localFsMocks.isFileSystemAccessSupported.mockReturnValue(true);
    localFsMocks.getPersistedDirectoryHandle.mockResolvedValue(null);

    render(
      <LocalBackupProvider>
        <div />
      </LocalBackupProvider>
    );

    await waitFor(() => expect(localBackupStore.getState().isInitializing).toBe(false));
    expect(localBackupStore.getState().enabled).toBe(true);
  });

  it("keeps enabled preference true when directory permission is revoked", async () => {
    window.localStorage.setItem("yarny_local_backups_enabled_v1", "true");

    localFsMocks.isFileSystemAccessSupported.mockReturnValue(true);
    const handle = {} as FileSystemDirectoryHandle;
    localFsMocks.getPersistedDirectoryHandle.mockResolvedValue(handle);
    localFsMocks.queryDirectoryPermission.mockResolvedValue("denied");

    render(
      <LocalBackupProvider>
        <div />
      </LocalBackupProvider>
    );

    await waitFor(() => expect(localFsMocks.queryDirectoryPermission).toHaveBeenCalled());

    const state = localBackupStore.getState();
    expect(state.enabled).toBe(true);
    expect(state.permission).toBe("denied");
    expect(state.repository).toBeNull();
  });
});


