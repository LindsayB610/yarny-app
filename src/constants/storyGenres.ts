export const STORY_GENRES = [
  "Literary Fiction",
  "Science Fiction",
  "Fantasy",
  "Mystery",
  "Thriller",
  "Horror",
  "Romance",
  "Historical Fiction",
  "Adventure",
  "Western",
  "Crime / Noir",
  "Comedy / Satire",
  "Magical Realism",
  "Dystopian / Post-apocalyptic",
  "Gothic",
  "Family Saga / Domestic Fiction",
  "Political / War Fiction",
  "Paranormal / Supernatural",
  "Young Adult (YA)",
  "Speculative / Slipstream"
] as const;

export type StoryGenre = (typeof STORY_GENRES)[number];

export const isStoryGenre = (value: string): value is StoryGenre =>
  STORY_GENRES.includes(value as StoryGenre);

