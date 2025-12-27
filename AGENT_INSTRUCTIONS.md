# Kanbn Board Agent Instructions

## Overview

This document provides instructions for AI agents to create, edit, move, and manage Kanbn task cards in the Strategy Tester WSL project.

## File Structure

```
.kanbn_boards/Strategy Tester WSL/
├── .kanbn/
│   ├── index.md              # Board structure with columns
│   └── tasks/                # Individual task markdown files
│       ├── task-name.md
│       └── ...
└── kanban-board.html         # Standalone board viewer
```

---

## Task File Format

Each task is a markdown file with YAML frontmatter:

```markdown
---
created: 2025-12-27T15:00:00.000Z
updated: 2025-12-27T15:00:00.000Z
assigned: ""
progress: 0
tags:
  - tag1
  - tag2
started: 2025-12-27T15:00:00.000Z    # Optional: set when moved to "In Progress"
completed: 2025-12-27T16:00:00.000Z  # Optional: set when moved to "Done"
due: 2025-12-30T00:00:00.000Z        # Optional: deadline
---

# Task Title

Task description and content in markdown format.

This can include multiple paragraphs, lists, code blocks, etc.

## Sections

You can organize content with headings.
```

---

## Column Names

The board has 5 columns:

1. **Backlog** - Tasks not yet ready to start
2. **Ready** - Tasks ready to be worked on
3. **In Progress** - Tasks currently being worked on
4. **Review** - Tasks awaiting review
5. **Done** - Completed tasks

---

## Creating a New Task

### Step 1: Generate Task Filename

Convert the task title to a filename:
- Lowercase all characters
- Replace spaces and special characters with hyphens
- Remove leading/trailing hyphens

**Examples:**
- "Fix Login Bug" → `fix-login-bug.md`
- "Task 35.1.1 - Ingest Issues" → `task-35-1-1-ingest-issues.md`
- "Frontend: Settings Page" → `frontend-settings-page.md`

### Step 2: Create Task File

Create `.kanbn_boards/Strategy Tester WSL/.kanbn/tasks/{filename}.md` with this template:

```markdown
---
created: {current_timestamp}
updated: {current_timestamp}
assigned: ""
progress: 0
tags:
  - {tag1}
  - {tag2}
---

# {Task Title}

{Task description and content}
```

**Timestamp Format:** ISO 8601 with milliseconds: `2025-12-27T15:30:00.000Z`

### Step 3: Add to index.md

Add the task link to the appropriate column in `.kanbn_boards/Strategy Tester WSL/.kanbn/index.md`:

```markdown
## Backlog

- [task-name](tasks/task-name.md)
- [another-task](tasks/another-task.md)
```

**Important:** 
- Task links use the format: `- [task-filename-without-extension](tasks/task-filename.md)`
- Add new tasks at the end of the column's task list
- Maintain the blank line between columns

---

## Moving a Task Between Columns

### Step 1: Update index.md

1. Find the task link in the source column
2. Remove it from that column
3. Add it to the target column

**Example:** Moving `task-35-1-1-ingest-issues-follow-up` from "In Progress" to "Done":

**Before:**
```markdown
## In Progress

- [task-35-1-1-ingest-issues-follow-up](tasks/task-35-1-1-ingest-issues-follow-up.md)

## Review

## Done

- [other-task](tasks/other-task.md)
```

**After:**
```markdown
## In Progress

## Review

## Done

- [other-task](tasks/other-task.md)
- [task-35-1-1-ingest-issues-follow-up](tasks/task-35-1-1-ingest-issues-follow-up.md)
```

### Step 2: Update Task File Metadata

Update the task file's frontmatter based on the target column:

**Always update:**
- `updated: {current_timestamp}`

**When moving TO "In Progress":**
- Add `started: {current_timestamp}` if not already present
- Optionally update `progress` if starting work

**When moving TO "Done":**
- Add `completed: {current_timestamp}` if not already present
- Set `progress: 100`

**Example:**

```yaml
---
created: 2025-12-23T00:00:00.000Z
updated: 2025-12-27T15:30:00.000Z    # ← Updated
assigned: ""
progress: 100                          # ← Updated to 100
tags:
  - phase-2
started: 2025-12-23T00:00:00.000Z
completed: 2025-12-27T15:30:00.000Z   # ← Added
---
```

---

## Editing a Task

### Updating Metadata

To update task metadata (tags, progress, assigned, due date):

1. Open `.kanbn_boards/Strategy Tester WSL/.kanbn/tasks/{task-name}.md`
2. Modify the YAML frontmatter
3. **Always** update the `updated` timestamp

**Example:** Adding tags and updating progress:

```yaml
---
created: 2025-12-23T00:00:00.000Z
updated: 2025-12-27T15:30:00.000Z    # ← Updated
assigned: "john-doe"                  # ← Modified
progress: 45                          # ← Modified
tags:
  - phase-2
  - ingest
  - ops                               # ← Added new tag
started: 2025-12-23T00:00:00.000Z
---
```

### Updating Content

To update the task description/content:

1. Open the task file
2. Modify the markdown content below the frontmatter
3. Update the `updated` timestamp in frontmatter

**Note:** The first `# Heading` is the task title. Everything after that is the description/content.

---

## Common Operations

### Adding Tags

Tags should be:
- Lowercase
- Hyphenated for multi-word tags
- Relevant to the task category or phase

**Common tags:**
- `phase-1`, `phase-2`, `phase-3`
- `ingest`, `backtest`, `frontend`, `backend`
- `ops`, `reliability`, `performance`
- `bug`, `feature`, `refactor`
- `urgent`, `blocked`

**Example:**
```yaml
tags:
  - phase-2
  - frontend
  - feature
```

### Setting Progress

Progress is a percentage from 0 to 100:
- `0` - Not started
- `25` - Started, early progress
- `50` - Half complete
- `75` - Nearly complete
- `100` - Complete (typically set when moving to Done)

### Setting Due Dates

Use ISO 8601 format:
```yaml
due: 2025-12-30T00:00:00.000Z
```

### Assigning Tasks

Use a simple identifier (username, initials, or name):
```yaml
assigned: "codex"
assigned: "planner"
assigned: ""  # Unassigned
```

---

## Validation Checklist

Before committing changes, verify:

- [ ] Task filename is lowercase with hyphens
- [ ] Task file has valid YAML frontmatter
- [ ] `created` timestamp exists and is valid
- [ ] `updated` timestamp is current
- [ ] Task link in `index.md` matches filename
- [ ] Task appears in exactly one column
- [ ] `started` timestamp exists if task is in "In Progress", "Review", or "Done"
- [ ] `completed` timestamp exists if task is in "Done"
- [ ] `progress` is 100 if task is in "Done"
- [ ] Tags are lowercase and relevant
- [ ] Task title (first `#` heading) is present

---

## Example Workflow: Creating and Completing a Task

### 1. Create Task

**File:** `.kanbn_boards/Strategy Tester WSL/.kanbn/tasks/fix-login-bug.md`

```markdown
---
created: 2025-12-27T10:00:00.000Z
updated: 2025-12-27T10:00:00.000Z
assigned: "codex"
progress: 0
tags:
  - bug
  - frontend
  - urgent
---

# Fix Login Bug

Users are unable to log in when using special characters in their password.

## Steps to Reproduce
1. Navigate to login page
2. Enter username and password with special chars (!@#$)
3. Click login
4. Error: "Invalid credentials"

## Expected Behavior
Login should succeed with valid credentials regardless of special characters.
```

**Update index.md:**
```markdown
## Backlog

- [fix-login-bug](tasks/fix-login-bug.md)
```

### 2. Move to In Progress

**Update index.md:** Move from Backlog to In Progress

**Update task file:**
```yaml
---
created: 2025-12-27T10:00:00.000Z
updated: 2025-12-27T11:00:00.000Z    # ← Updated
assigned: "codex"
progress: 10                          # ← Updated
tags:
  - bug
  - frontend
  - urgent
started: 2025-12-27T11:00:00.000Z    # ← Added
---
```

### 3. Update Progress

**Update task file:**
```yaml
---
created: 2025-12-27T10:00:00.000Z
updated: 2025-12-27T13:00:00.000Z    # ← Updated
assigned: "codex"
progress: 75                          # ← Updated
tags:
  - bug
  - frontend
  - urgent
started: 2025-12-27T11:00:00.000Z
---
```

### 4. Complete Task

**Update index.md:** Move from In Progress to Done

**Update task file:**
```yaml
---
created: 2025-12-27T10:00:00.000Z
updated: 2025-12-27T15:00:00.000Z    # ← Updated
assigned: "codex"
progress: 100                         # ← Updated
tags:
  - bug
  - frontend
  - urgent
started: 2025-12-27T11:00:00.000Z
completed: 2025-12-27T15:00:00.000Z  # ← Added
---
```

---

## Tips for Agents

1. **Always update timestamps:** The `updated` field should reflect the current time whenever you modify a task
2. **Preserve formatting:** Maintain the existing YAML structure and markdown formatting
3. **Use descriptive filenames:** Make task filenames clear and searchable
4. **Tag appropriately:** Use existing tags when possible for consistency
5. **Validate before saving:** Check that all required fields are present
6. **Keep index.md clean:** Maintain blank lines between columns for readability
7. **Progress tracking:** Update progress percentage as work progresses
8. **Completion markers:** Always set `completed` and `progress: 100` when moving to Done

---

## Troubleshooting

**Task not appearing in board:**
- Check that the task link in `index.md` matches the filename exactly
- Verify the task file exists in the `tasks/` directory
- Ensure the YAML frontmatter is valid

**Invalid YAML error:**
- Check for proper indentation (2 spaces for list items)
- Ensure colons have a space after them
- Verify timestamps are in ISO 8601 format
- Check that tags are properly formatted as a list

**Task in wrong column:**
- Verify the task link is under the correct `## Column Name` heading in `index.md`
- Check that there's only one instance of the task link in the file

---

## File Paths Reference

- **Board index:** `.kanbn_boards/Strategy Tester WSL/.kanbn/index.md`
- **Tasks directory:** `.kanbn_boards/Strategy Tester WSL/.kanbn/tasks/`
- **Board viewer:** `.kanbn_boards/Strategy Tester WSL/kanban-board.html`
- **This file:** `.kanbn_boards/Strategy Tester WSL/AGENT_INSTRUCTIONS.md`
