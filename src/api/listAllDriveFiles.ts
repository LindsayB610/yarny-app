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
    console.log(`[listAllDriveFiles] Fetching page ${pagesFetched + 1} for folder:`, folderId, pageToken ? `(token: ${pageToken.substring(0, 10)}...)` : "(no token)");
    const response = await apiClient.listDriveFiles({
      folderId,
      pageToken
    });

    if (response.files?.length) {
      allFiles.push(...response.files);
      console.log(`[listAllDriveFiles] Page ${pagesFetched + 1} returned ${response.files.length} files, total: ${allFiles.length}`);
    }

    pageToken = response.nextPageToken ?? undefined;
    pagesFetched += 1;
  } while (pageToken && pagesFetched < MAX_PAGES);
  
  console.log(`[listAllDriveFiles] Completed listing folder ${folderId}: ${allFiles.length} total files across ${pagesFetched} pages`);

  if (pageToken) {
    console.warn(
      `[listAllDriveFiles] Reached page limit (${MAX_PAGES}) while listing folder ${folderId}. ` +
        "Some files may be missing."
    );
  }

  return allFiles;
}


