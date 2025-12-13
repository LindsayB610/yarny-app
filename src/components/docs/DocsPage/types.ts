import type { JSX } from "react";

export const DRAWER_WIDTH = 288;

export const GENRE_DESCRIPTIONS = [
  {
    name: "Literary Fiction",
    description:
      "Character-driven, stylistically ambitious work focused on theme, voice, and human psychology."
  },
  {
    name: "Science Fiction",
    description:
      "Explores scientific or technological \"what-ifs,\" from spacefaring futures to AI ethics and alternate realities."
  },
  {
    name: "Fantasy",
    description:
      "Worlds shaped by magic, myth, or the supernatural; includes subgenres like epic, urban, and dark fantasy."
  },
  {
    name: "Mystery",
    description:
      "Built around solving a puzzle, crime, or secret through logic, intuition, or investigation."
  },
  {
    name: "Thriller",
    description:
      "High-stakes, tightly paced stories driven by danger, pursuit, or conspiracy."
  },
  {
    name: "Horror",
    description:
      "Designed to evoke fear or dread through the monstrous, uncanny, or psychologically disturbing."
  },
  {
    name: "Romance",
    description:
      "Centers on love and emotional intimacy, usually culminating in hope or resolution."
  },
  {
    name: "Historical Fiction",
    description:
      "Imagined narratives set in authentic past eras, blending research and storytelling."
  },
  {
    name: "Adventure",
    description:
      "Focused on exploration, physical challenge, and daring exploits in vivid settings."
  },
  {
    name: "Western",
    description:
      "Set against the American frontier or similar landscapes of lawlessness and moral testing."
  },
  {
    name: "Crime / Noir",
    description:
      "Examines morality, justice, and corruption through the lens of criminals or investigators."
  },
  {
    name: "Comedy / Satire",
    description:
      "Uses humor, irony, or exaggeration to critique human behavior or society."
  },
  {
    name: "Magical Realism",
    description:
      "The ordinary world laced with subtle, unexplained magic treated as mundane."
  },
  {
    name: "Dystopian / Post-apocalyptic",
    description:
      "Portrays societies after collapse or under oppressive control, often as cautionary allegory."
  },
  {
    name: "Gothic",
    description:
      "Brooding atmosphere, decaying settings, and emotional excess; where horror meets romance and ruin."
  },
  {
    name: "Family Saga / Domestic Fiction",
    description:
      "Multi-generational or household dramas exploring love, duty, and identity."
  },
  {
    name: "Political / War Fiction",
    description:
      "Stories centered on ideology, espionage, and moral conflict in times of unrest."
  },
  {
    name: "Paranormal / Supernatural",
    description:
      "Ghosts, hauntings, psychic phenomena, and spiritual intrusion on daily life."
  },
  {
    name: "Young Adult (YA)",
    description:
      "Coming-of-age tales foregrounding adolescent identity and discovery, across any setting or tone."
  },
  {
    name: "Speculative / Slipstream",
    description:
      "Genre-bending fiction that mixes realism with the surreal or metaphysical; fiction that feels slightly out of phase with the real world."
  }
] as const;

export type SectionDefinition = {
  id: string;
  title: string;
  icon: JSX.Element;
  body: JSX.Element;
};

export type SectionGroup = {
  id: string;
  label: string;
  sectionIds: string[];
};

// Map URL category slugs to section group labels
export const CATEGORY_TO_GROUP: Record<string, string> = {
  "getting-started": "Overview",
  "writing": "Writing Workflow",
  "goals": "Goals & Metrics",
  "operations": "Operations & Sync",
  "support": "Support & Resources"
};

