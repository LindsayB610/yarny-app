import { render, screen, userEvent, waitFor } from "../../../tests/utils/test-utils";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { StorageSettingsSection } from "./StorageSettingsSection";
import { useLocalBackups } from "../../hooks/useLocalBackups";
import { refreshAllStoriesToLocal } from "../../services/localFs/localBackupMirror";
import { useYarnyStoreApi } from "../../store/provider";

vi.mock("../../hooks/useLocalBackups", () => ({
  useLocalBackups: vi.fn()
}));

vi.mock("../../services/localFs/localBackupMirror", () => ({
  refreshAllStoriesToLocal: vi.fn()
}));

vi.mock("../../store/provider", () => ({
  useYarnyStoreApi: vi.fn()
}));

const mockUseLocalBackups = vi.mocked(useLocalBackups);
const mockRefreshAllStories = vi.mocked(refreshAllStoriesToLocal);
const mockUseYarnyStoreApi = vi.mocked(useYarnyStoreApi);

const createState = (overrides: Partial<ReturnType<typeof useLocalBackups>> = {}) => ({
  enabled: false,
  isSupported: true,
  isInitializing: false,
  permission: "prompt" as PermissionState,
  lastSyncedAt: null,
  error: null,
  rootHandle: null,
  repository: null,
  enableLocalBackups: vi.fn().mockResolvedValue({ success: true }),
  disableLocalBackups: vi.fn().mockResolvedValue({ success: true }),
  refreshPermission: vi.fn().mockResolvedValue("prompt" as PermissionState),
  openLocalFolder: vi.fn().mockResolvedValue({ success: true }),
  refreshStatus: "idle" as const,
  refreshMessage: null,
  refreshCompletedAt: null,
  setRefreshStatus: vi.fn(),
  ...overrides
});

describe("StorageSettingsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocalBackups.mockReturnValue(createState());
    mockUseYarnyStoreApi.mockReturnValue({
      getState: () =>
        ({
          entities: {
            projects: {},
            projectOrder: [],
            stories: {},
            storyOrder: [],
            chapters: {},
            snippets: {}
          },
          ui: {
            isSyncing: false
          }
        }) as any
    });
    mockRefreshAllStories.mockResolvedValue({ success: true });
  });

  it("disables toggle and shows warning when browser unsupported", () => {
    mockUseLocalBackups.mockReturnValue(createState({ isSupported: false }));

    render(<StorageSettingsSection />);

    expect(
      screen.getByText(/does not support the File System Access API/i)
    ).toBeInTheDocument();
    const toggle = screen.getByLabelText(/enable local story backups/i);
    expect(toggle).toBeDisabled();
  });

  it("calls enable and disable handlers from buttons", async () => {
    const enable = vi.fn().mockResolvedValue({ success: true });
    const disable = vi.fn().mockResolvedValue({ success: true });
    mockUseLocalBackups.mockReturnValue(
      createState({
        enableLocalBackups: enable,
        disableLocalBackups: disable,
        isSupported: true
      })
    );

    render(<StorageSettingsSection />);

    await userEvent.click(screen.getByRole("button", { name: /choose folder/i }));
    await waitFor(() => {
      expect(enable).toHaveBeenCalledTimes(1);
    });

    const toggle = screen.getByLabelText(/enable local story backups/i);
    await userEvent.click(toggle);
    await waitFor(() => {
      expect(enable).toHaveBeenCalledTimes(2);
    });

    mockUseLocalBackups.mockReturnValue(
      createState({
        enabled: true,
        permission: "granted",
        enableLocalBackups: enable,
        disableLocalBackups: disable
      })
    );

    render(<StorageSettingsSection />);

    const disconnectButtons = screen.getAllByRole("button", { name: /disconnect/i });
    const activeDisconnect = disconnectButtons.find((button) => !button.hasAttribute("disabled"));
    expect(activeDisconnect).toBeDefined();
    if (activeDisconnect) {
      await userEvent.click(activeDisconnect);
    }
    await waitFor(() => {
      expect(disable).toHaveBeenCalledTimes(1);
    });
  });

  it("triggers full refresh when button is clicked", async () => {
    const state = createState({
      enabled: true,
      permission: "granted"
    });
    mockUseLocalBackups.mockReturnValue(state);

    render(<StorageSettingsSection />);

    await userEvent.click(screen.getByRole("button", { name: /Refresh Local Backups/i }));
    expect(state.setRefreshStatus).toHaveBeenCalledWith(
      "running",
      expect.stringContaining("Refreshing")
    );
    await waitFor(() => {
      expect(mockRefreshAllStories).toHaveBeenCalledTimes(1);
    });
  });
});


