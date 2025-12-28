import * as vscode from 'vscode';

export interface TaskData {
  name: string;
  column: string;
  title: string;
  description: string;
  frontmatter: Record<string, string | number | string[]>;
}

export interface BoardData {
  title: string;
  columns: string[];
  columnMap: Record<string, string[]>;
  tasks: TaskData[];
}

const DEFAULT_COLUMNS = ['Backlog', 'Ready', 'In Progress', 'Review', 'Done'];

export class KanbnStore {
  private kanbnDir: vscode.Uri;

  constructor(kanbnDir: vscode.Uri) {
    this.kanbnDir = kanbnDir;
  }

  async loadBoard(): Promise<BoardData> {
    const indexUri = vscode.Uri.joinPath(this.kanbnDir, 'index.md');
    const indexContent = await readTextFile(indexUri);
    const indexData = parseIndexMd(indexContent);
    for (const column of DEFAULT_COLUMNS) {
      if (!indexData.columns[column]) {
        indexData.columns[column] = [];
      }
    }

    const tasks: TaskData[] = [];
    for (const column of Object.keys(indexData.columns)) {
      for (const taskName of indexData.columns[column]) {
        const taskUri = vscode.Uri.joinPath(this.kanbnDir, 'tasks', `${taskName}.md`);
        try {
          const taskContent = await readTextFile(taskUri);
          const taskData = parseTaskMd(taskContent);
          tasks.push({
            name: taskName,
            column,
            title: taskData.title,
            description: taskData.description,
            frontmatter: taskData.frontmatter
          });
        } catch (err) {
          console.warn(`Missing task file: ${taskName}`, err);
        }
      }
    }

    return {
      title: indexData.title || 'Kanban Board',
      columns: DEFAULT_COLUMNS,
      columnMap: indexData.columns,
      tasks
    };
  }

  async moveTask(taskName: string, fromColumn: string, toColumn: string): Promise<void> {
    const indexUri = vscode.Uri.joinPath(this.kanbnDir, 'index.md');
    const indexContent = await readTextFile(indexUri);
    const updatedIndex = moveTaskInIndex(indexContent, taskName, fromColumn, toColumn);
    await writeTextFile(indexUri, updatedIndex);

    const taskUri = vscode.Uri.joinPath(this.kanbnDir, 'tasks', `${taskName}.md`);
    const taskContent = await readTextFile(taskUri);
    const now = new Date().toISOString();
    const parsed = parseTaskMd(taskContent);

    const updates: Record<string, string | number | string[]> = {
      updated: now
    };

    if (toColumn === 'In Progress') {
      if (!parsed.frontmatter.started) {
        updates.started = now;
      }
    }

    if (toColumn === 'Done') {
      updates.progress = 100;
      if (!parsed.frontmatter.completed) {
        updates.completed = now;
      }
    }

    const updatedTask = updateTaskFrontmatter(taskContent, updates);
    await writeTextFile(taskUri, updatedTask);
  }

  async updateTask(taskName: string, data: {
    title: string;
    assigned: string;
    progress: number;
    due?: string | null;
    tags: string[];
    content: string;
  }): Promise<void> {
    const taskUri = vscode.Uri.joinPath(this.kanbnDir, 'tasks', `${taskName}.md`);
    const taskContent = await readTextFile(taskUri);
    const updates: Record<string, string | number | string[]> = {
      updated: new Date().toISOString(),
      assigned: data.assigned,
      progress: data.progress,
      tags: data.tags
    };

    if (data.due) {
      updates.due = data.due;
    }

    const updatedTask = updateTaskFrontmatter(taskContent, updates, data.title, data.content);
    await writeTextFile(taskUri, updatedTask);
  }

  async createTask(data: {
    title: string;
    assigned: string;
    progress: number;
    due?: string | null;
    tags: string[];
    content: string;
  }): Promise<string> {
    const slugBase = slugify(data.title);
    const taskName = await ensureUniqueTaskName(this.kanbnDir, slugBase);
    const now = new Date().toISOString();

    const frontmatterLines = buildFrontmatterLines({
      created: now,
      updated: now,
      assigned: data.assigned,
      progress: data.progress,
      tags: data.tags,
      due: data.due || undefined
    });

    const body = buildTaskBody(data.title, data.content);
    const content = buildTaskFile(frontmatterLines, body);

    const taskUri = vscode.Uri.joinPath(this.kanbnDir, 'tasks', `${taskName}.md`);
    await writeTextFile(taskUri, content);

    const indexUri = vscode.Uri.joinPath(this.kanbnDir, 'index.md');
    const indexContent = await readTextFile(indexUri);
    const updatedIndex = addTaskToColumn(indexContent, taskName, 'Backlog');
    await writeTextFile(indexUri, updatedIndex);

    return taskName;
  }

  static async resolveKanbnDir(selectedDir: vscode.Uri): Promise<vscode.Uri | null> {
    const indexUri = vscode.Uri.joinPath(selectedDir, 'index.md');
    const tasksUri = vscode.Uri.joinPath(selectedDir, 'tasks');
    if (await exists(indexUri) && await exists(tasksUri)) {
      return selectedDir;
    }

    const nested = vscode.Uri.joinPath(selectedDir, '.kanbn');
    const nestedIndex = vscode.Uri.joinPath(nested, 'index.md');
    const nestedTasks = vscode.Uri.joinPath(nested, 'tasks');
    if (await exists(nestedIndex) && await exists(nestedTasks)) {
      return nested;
    }

    return null;
  }
}

async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

async function readTextFile(uri: vscode.Uri): Promise<string> {
  const data = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(data).toString('utf8');
}

async function writeTextFile(uri: vscode.Uri, content: string): Promise<void> {
  const data = Buffer.from(content, 'utf8');
  await vscode.workspace.fs.writeFile(uri, data);
}

function parseIndexMd(content: string): { title: string; columns: Record<string, string[]> } {
  const lines = content.split(/\r?\n/);
  const data = { title: '', columns: {} as Record<string, string[]> };
  let inFrontmatter = false;
  let currentColumn: string | null = null;

  for (const line of lines) {
    if (line.trim() === '---') {
      inFrontmatter = !inFrontmatter;
      continue;
    }

    if (inFrontmatter) {
      continue;
    }

    if (line.startsWith('# ')) {
      data.title = line.substring(2).trim();
    } else if (line.startsWith('## ')) {
      currentColumn = line.substring(3).trim();
      if (!data.columns[currentColumn]) {
        data.columns[currentColumn] = [];
      }
    } else if (line.startsWith('- [') && currentColumn) {
      const match = line.match(/- \[[^\]]+\]\(tasks\/([^)]+)\)/);
      if (match) {
        data.columns[currentColumn].push(match[1].replace(/\.md$/, ''));
      }
    }
  }

  return data;
}

function moveTaskInIndex(content: string, taskName: string, fromColumn: string, toColumn: string): string {
  const lines = content.split(/\r?\n/);
  const taskLine = `- [${taskName}](tasks/${taskName}.md)`;

  removeLineInColumn(lines, taskLine, fromColumn);
  insertLineInColumn(lines, taskLine, toColumn);

  return lines.join('\n');
}

function addTaskToColumn(content: string, taskName: string, column: string): string {
  const lines = content.split(/\r?\n/);
  const taskLine = `- [${taskName}](tasks/${taskName}.md)`;
  insertLineInColumn(lines, taskLine, column);
  return lines.join('\n');
}

function removeLineInColumn(lines: string[], taskLine: string, column: string): void {
  const range = findColumnRange(lines, column);
  if (!range) {
    return;
  }
  for (let i = range.start + 1; i < range.end; i += 1) {
    if (lines[i].trim() === taskLine.trim()) {
      lines.splice(i, 1);
      return;
    }
  }
}

function insertLineInColumn(lines: string[], taskLine: string, column: string): void {
  const range = findColumnRange(lines, column);
  if (!range) {
    return;
  }

  const nextHeader = range.end;
  let insertionIndex = nextHeader;
  if (insertionIndex > range.start + 1 && lines[insertionIndex - 1].trim() === '') {
    insertionIndex -= 1;
  }

  lines.splice(insertionIndex, 0, taskLine);
}

function findColumnRange(lines: string[], column: string): { start: number; end: number } | null {
  let currentColumn: string | null = null;
  let start = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      if (currentColumn === column) {
        return { start, end: i };
      }
      currentColumn = line.substring(3).trim();
      start = i;
    }
  }

  if (currentColumn === column) {
    return { start, end: lines.length };
  }

  return null;
}

function parseTaskMd(content: string): {
  frontmatter: Record<string, string | number | string[]>;
  title: string;
  description: string;
} {
  const { frontmatterLines, body } = splitFrontmatter(content);
  const frontmatter = parseFrontmatterLines(frontmatterLines);

  const bodyLines = body.split(/\r?\n/);
  let title = '';
  let descriptionLines: string[] = [];
  let foundTitle = false;

  for (const line of bodyLines) {
    if (!foundTitle && line.startsWith('# ')) {
      title = line.substring(2).trim();
      foundTitle = true;
      continue;
    }
    if (foundTitle) {
      descriptionLines.push(line);
    }
  }

  const description = descriptionLines.join('\n').trim();
  return { frontmatter, title, description };
}

function splitFrontmatter(content: string): { frontmatterLines: string[]; body: string } {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0 || lines[0].trim() !== '---') {
    return { frontmatterLines: [], body: content };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatterLines: [], body: content };
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const body = lines.slice(endIndex + 1).join('\n');
  return { frontmatterLines, body };
}

function parseFrontmatterLines(lines: string[]): Record<string, string | number | string[]> {
  const data: Record<string, string | number | string[]> = {};
  let currentKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('- ')) {
      if (currentKey && Array.isArray(data[currentKey])) {
        (data[currentKey] as string[]).push(unquote(trimmed.substring(2)));
      }
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      currentKey = null;
      continue;
    }

    const key = match[1];
    const value = match[2];
    currentKey = key;

    if (value === '') {
      data[key] = [];
    } else if (value === '[]') {
      data[key] = [];
    } else {
      const unquoted = unquote(value);
      const numeric = Number(unquoted);
      data[key] = Number.isFinite(numeric) && `${numeric}` === unquoted ? numeric : unquoted;
    }
  }

  return data;
}

function updateTaskFrontmatter(
  content: string,
  updates: Record<string, string | number | string[]>,
  title?: string,
  body?: string
): string {
  const split = splitFrontmatter(content);
  const updatedLines = applyFrontmatterUpdates(split.frontmatterLines, updates);
  const frontmatter = buildFrontmatterBlock(updatedLines);

  const newBody = title ? buildTaskBody(title, body || '') : split.body.trim();
  return `${frontmatter}\n\n${newBody}\n`;
}

function applyFrontmatterUpdates(lines: string[], updates: Record<string, string | number | string[]>): string[] {
  const updated = [...lines];

  for (const [key, value] of Object.entries(updates)) {
    const replacement = buildFrontmatterLines({ [key]: value });
    const range = findKeyRange(updated, key);
    if (range) {
      updated.splice(range.start, range.end - range.start, ...replacement);
    } else {
      updated.push(...replacement);
    }
  }

  return updated;
}

function findKeyRange(lines: string[], key: string): { start: number; end: number } | null {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(/^([A-Za-z0-9_-]+):/);
    if (match && match[1] === key) {
      let end = i + 1;
      for (let j = i + 1; j < lines.length; j += 1) {
        if (/^[A-Za-z0-9_-]+:/.test(lines[j])) {
          end = j;
          break;
        }
        end = j + 1;
      }
      return { start: i, end };
    }
  }
  return null;
}

function buildFrontmatterBlock(lines: string[]): string {
  const trimmed = lines.length ? lines : [];
  return `---\n${trimmed.join('\n')}\n---`;
}

function buildFrontmatterLines(values: Record<string, string | number | string[] | undefined>): string[] {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${item}`);
        }
      }
      continue;
    }

    lines.push(`${key}: ${formatScalar(value)}`);
  }

  return lines;
}

function formatScalar(value: string | number): string {
  if (typeof value === 'number') {
    return `${value}`;
  }
  if (value === '') {
    return '""';
  }
  if (/[:#\s]/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.substring(1, trimmed.length - 1);
  }
  return trimmed;
}

function buildTaskBody(title: string, content: string): string {
  const trimmed = content.trim();
  if (trimmed) {
    return `# ${title}\n\n${trimmed}`;
  }
  return `# ${title}`;
}

function buildTaskFile(frontmatterLines: string[], body: string): string {
  return `---\n${frontmatterLines.join('\n')}\n---\n\n${body}\n`;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureUniqueTaskName(kanbnDir: vscode.Uri, base: string): Promise<string> {
  let candidate = base || 'task';
  let counter = 1;

  while (await exists(vscode.Uri.joinPath(kanbnDir, 'tasks', `${candidate}.md`))) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }

  return candidate;
}
