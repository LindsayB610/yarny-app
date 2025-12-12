# Instructions for Creating Test Novel Project

Create a test novel project with the following structure and content:

## Project Structure

Create a directory called `test-novel` with this structure:

```
test-novel/
├── drafts/
│   ├── chapter-1/
│   │   ├── 01-opening.md
│   │   ├── 02-the-discovery.md
│   │   └── 03-first-conflict.md
│   ├── chapter-2/
│   │   ├── 01-new-day.md
│   │   └── 02-investigation.md
│   └── chapter-3/
│       ├── 01-revelation.md
│       └── 02-resolution.md
├── characters/
│   ├── protagonist.md
│   └── mentor.md
├── worldbuilding/
│   └── setting.md
└── README.md
```

## File Contents

### README.md

```markdown
# Test Novel

A test project for Yarny local file integration.

This is a sample novel project to test importing and editing local markdown files in Yarny.
```

### drafts/chapter-1/01-opening.md

```markdown
The morning sun filtered through the dusty windows of the old library. Alex pulled another book from the shelf, running a finger along the spine. Something felt different about this one.

The leather binding was warm to the touch, and when Alex opened it, the pages seemed to shimmer for just a moment. A map fell out, covered in strange symbols that didn't match any language Alex recognized.

"This is it," Alex whispered. "This is what I've been looking for."
```

### drafts/chapter-1/02-the-discovery.md

```markdown
The symbols on the map glowed faintly in the dim light. Alex traced a finger along one of the lines, and suddenly the entire map shifted. The symbols rearranged themselves, forming a new pattern.

A voice echoed from the book itself: "You have been chosen, seeker. The path ahead is dangerous, but necessary."

Alex's heart raced. This wasn't just an old book—it was something alive, something magical. And it had chosen Alex for a reason.
```

### drafts/chapter-1/03-first-conflict.md

```markdown
The library door creaked open. Alex quickly shoved the map into a pocket and closed the book, but it was too late. The librarian, Ms. Chen, stood in the doorway, her eyes narrowed.

"Alex, what are you doing in the restricted section?" she asked, her voice sharp.

"I—I was just looking," Alex stammered, but Ms. Chen's expression suggested she knew more than she was letting on. The book in Alex's hands felt heavier now, as if it were warning of danger.
```

### drafts/chapter-2/01-new-day.md

```markdown
The next morning, Alex couldn't stop thinking about the book and the map. The symbols had burned themselves into memory, and Alex could almost feel them pulsing with energy.

At school, everything seemed normal—too normal. The other students chatted about weekend plans, teachers lectured about history and math, but Alex's mind kept returning to that library, that book, that map.

Something was coming. Alex could sense it.
```

### drafts/chapter-2/02-investigation.md

```markdown
After school, Alex returned to the library. The book was still on the shelf where it had been left, but now it felt different—cold, almost hostile.

Ms. Chen appeared again, this time with a knowing smile. "I see you've found it," she said. "The Book of Paths. It's been waiting for someone like you."

"Someone like me?" Alex asked.

"Someone who can read between the lines," Ms. Chen replied. "Someone who can see the magic that others miss."
```

### drafts/chapter-3/01-revelation.md

```markdown
The map led Alex to an old warehouse on the edge of town. Inside, the symbols from the map were painted on the walls, glowing with the same energy Alex had felt in the library.

In the center of the room stood a figure—tall, cloaked, holding another book. "You're early," the figure said. "But that's good. We have much to discuss."

The figure lowered their hood, revealing Ms. Chen's face, but her eyes were different now. They glowed with the same light as the symbols.
```

### drafts/chapter-3/02-resolution.md

```markdown
"The world you know is only one layer of reality," Ms. Chen explained. "The Book of Paths connects all the layers. You, Alex, are a Path-Walker—someone who can move between them."

Alex looked at the map, now understanding its true purpose. "What do I need to do?"

"Walk the path," Ms. Chen said simply. "The book will guide you, but the choice is yours. You can return to your normal life, or you can step into a world of magic and danger."

Alex took a deep breath and reached for the book. The choice was already made.
```

### characters/protagonist.md

```markdown
# Alex

**Age:** 16
**Role:** Protagonist, Path-Walker

A curious and determined teenager who discovers they have the ability to see and navigate between different layers of reality. Alex is resourceful, brave, and has a strong sense of justice.
```

### characters/mentor.md

```markdown
# Ms. Chen

**Age:** Unknown (appears middle-aged)
**Role:** Mentor, Librarian, Guardian

The mysterious librarian who guides Alex on their journey. She is a powerful Path-Walker herself, tasked with finding and training new recruits. She appears stern but is deeply caring.
```

### worldbuilding/setting.md

```markdown
# Setting

The story takes place in a small, seemingly ordinary town that exists on multiple layers of reality. The library serves as a nexus point where different layers intersect, making it a place of power and danger.

The "layers" are parallel realities that overlap with our own, each with its own rules, inhabitants, and magic. Path-Walkers can move between these layers, but doing so requires skill, training, and the guidance of the Book of Paths.
```

## Important Notes

- All snippet files use the `##-name.md` format (e.g., `01-opening.md`)
- Chapter folders are numbered sequentially (`chapter-1`, `chapter-2`, etc.)
- Each snippet is a self-contained scene/chunk of prose
- Character and worldbuilding files are in separate directories
- No frontmatter in any files—just pure markdown content

This structure matches what Yarny will expect when importing a local project.

