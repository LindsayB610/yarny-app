const TITLE_KEYS = [
  "title",
  "name",
  "storyTitle",
  "story_name",
  "storyName",
  "projectTitle"
] as const;

const NESTED_KEYS = ["project", "story", "metadata", "info", "details"] as const;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringValue = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

export const extractStoryTitleFromMetadata = (metadata: unknown): string | undefined => {
  const visited = new WeakSet<object>();

  const search = (value: unknown): string | undefined => {
    const directString = getStringValue(value);
    if (directString) {
      return directString;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = search(item);
        if (found) {
          return found;
        }
      }
      return undefined;
    }

    if (!isObject(value)) {
      return undefined;
    }

    if (visited.has(value)) {
      return undefined;
    }
    visited.add(value);

    for (const key of TITLE_KEYS) {
      const candidate = search(value[key]);
      if (candidate) {
        return candidate;
      }
    }

    for (const key of NESTED_KEYS) {
      const nested = value[key];
      if (nested) {
        const candidate = search(nested);
        if (candidate) {
          return candidate;
        }
      }
    }

    return undefined;
  };

  return search(metadata);
};


