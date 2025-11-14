import { apiClient } from "./client";
import type { DriveFile } from "./contract";

const MAX_PAGES = 1000;

export async function listAllDriveFiles(folderId: string | undefined): Promise<DriveFile[]> {
  if (!folderId) {
    return [];
  }

  const allFiles: DriveFile[] = [];
  let pageToken: string | undefined;
  let pagesFetched = 0;

  do {
    const response = await apiClient.listDriveFiles({
      folderId,
      pageToken
    });

    if (response.files?.length) {
      allFiles.push(...response.files);
    }

    pageToken = response.nextPageToken ?? undefined;
    pagesFetched += 1;
  } while (pageToken && pagesFetched < MAX_PAGES);

  if (pageToken) {
    console.warn(
      `[listAllDriveFiles] Reached page limit (${MAX_PAGES}) while listing folder ${folderId}. ` +
        "Some files may be missing."
    );
  }

  return allFiles;
}


