const TITLE_KEYS = [
  "title",
  "name",
  "storyTitle",
  "story_name",
  "storyName",
  "projectTitle",
  "projectName",
  "storyDisplayName"
] as const;

const NESTED_KEYS = ["project", "story", "metadata", "info", "details"] as const;

const PLACEHOLDER_TITLES = new Set(
  ["new project", "untitled story", "new story", "story title", "project title"].map((value) =>
    value.toLowerCase()
  )
);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringValue = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

const getStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const strings = value
      .map((item) => (typeof item === "string" ? item.trim() : undefined))
      .filter((item): item is string => Boolean(item && item.length > 0));
    return strings.length > 0 ? strings : undefined;
  }
  return undefined;
};

const isPlaceholderTitle = (value: string | undefined): value is string => {
  if (!value) {
    return false;
  }
  return PLACEHOLDER_TITLES.has(value.trim().toLowerCase());
};

export const extractStoryTitleFromMetadata = (metadata: unknown): string | undefined => {
  if (!metadata) {
    return undefined;
  }

  const visited = new WeakSet<object>();
  const candidates: string[] = [];

  const search = (value: unknown): void => {
    if (value == null) {
      return;
    }

    const directString = getStringValue(value);
    if (directString) {
      candidates.push(directString);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(search);
      return;
    }

    if (!isObject(value) || visited.has(value)) {
      return;
    }
    visited.add(value);

    for (const key of TITLE_KEYS) {
      if (key in value) {
        const nestedValue = value[key];
        const nestedString = getStringValue(nestedValue);
        if (nestedString) {
          candidates.push(nestedString);
        } else {
          search(nestedValue);
        }
      }
    }

    for (const key of NESTED_KEYS) {
      if (key in value) {
        search(value[key]);
      }
    }
  };

  search(metadata);

  const normalized = candidates.map((candidate) => candidate.trim()).filter(Boolean);
  const preferred = normalized.find((candidate) => !isPlaceholderTitle(candidate));
  return preferred ?? normalized[0];
};

export const extractGroupOrderFromMetadata = (metadata: unknown): string[] | undefined => {
  if (!metadata) {
    return undefined;
  }

  const visited = new WeakSet<object>();
  const ORDER_KEYS = [
    "groupIds",
    "groupOrder",
    "chapterIds",
    "chapterOrder",
    "group_ids",
    "chapter_ids",
    "groupsOrder",
    "outlineIds",
    "sectionOrder"
  ] as const;

  const search = (value: unknown): string[] | undefined => {
    if (!value) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return getStringArray(value);
    }

    if (!isObject(value)) {
      return undefined;
    }

    if (visited.has(value)) {
      return undefined;
    }
    visited.add(value);

    for (const key of ORDER_KEYS) {
      if (key in value) {
        const arrayCandidate = getStringArray(value[key]);
        if (arrayCandidate) {
          return arrayCandidate;
        }
        const nested = search(value[key]);
        if (nested) {
          return nested;
        }
      }
    }

    for (const nestedValue of Object.values(value)) {
      const result = search(nestedValue);
      if (result) {
        return result;
      }
    }

    return undefined;
  };

  return search(metadata);
};

