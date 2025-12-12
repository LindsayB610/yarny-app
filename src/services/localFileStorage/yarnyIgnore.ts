/**
 * Parses a .yarnyignore file and returns a function to check if a path should be ignored
 * Supports glob patterns similar to .gitignore
 */
export async function parseYarnyIgnore(
  rootHandle: FileSystemDirectoryHandle
): Promise<(path: string) => boolean> {
  // Ensure we return a function even if there's an error
  let ignoreContent = "";
  
  try {
    const ignoreHandle = await rootHandle.getFileHandle(".yarnyignore");
    const ignoreFile = await ignoreHandle.getFile();
    ignoreContent = await ignoreFile.text();
  } catch (error) {
    if ((error as DOMException).name === "NotFoundError") {
      // No .yarnyignore file - return function that never ignores
      return () => false;
    }
    throw error;
  }

  // Parse ignore patterns
  const patterns = ignoreContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#")); // Remove comments and empty lines

  // Convert glob patterns to regex
  const regexPatterns = patterns.map((pattern) => {
    // Escape special regex characters except * and ?
    let regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, "___DOUBLE_STAR___")
      .replace(/\*/g, "[^/]*")
      .replace(/___DOUBLE_STAR___/g, ".*")
      .replace(/\?/g, "[^/]");

    // Anchor to start if pattern doesn't start with /
    if (!pattern.startsWith("/")) {
      regex = `(^|/)${regex}`;
    } else {
      regex = `^${regex}`;
    }

    // Anchor to end if pattern doesn't end with /
    if (!pattern.endsWith("/")) {
      regex = `${regex}$`;
    }

    return new RegExp(regex);
  });

  return (path: string) => {
    // Normalize path separators
    const normalizedPath = path.replace(/\\/g, "/");
    
    // Check if any pattern matches
    return regexPatterns.some((pattern) => pattern.test(normalizedPath));
  };
}

/**
 * Checks if a file or directory should be ignored based on .yarnyignore
 */
export async function shouldIgnore(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string
): Promise<boolean> {
  const isIgnored = await parseYarnyIgnore(rootHandle);
  return isIgnored(relativePath);
}

