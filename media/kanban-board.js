const vscode = acquireVsCodeApi();

const state = {
  board: null,
  tasks: new Map(),
  columns: ['Backlog', 'Ready', 'In Progress', 'Review', 'Done'],
  currentTask: null
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  setupEventListeners();
  vscode.postMessage({ type: 'ready' });
}

function setupEventListeners() {
  document.getElementById('select-dir-btn').addEventListener('click', () => {
    vscode.postMessage({ type: 'selectBoard' });
  });
  document.getElementById('refresh-btn').addEventListener('click', () => requestBoard());
  document.getElementById('new-task-btn').addEventListener('click', () => openTaskEditor(null, 'Backlog'));
  document.getElementById('close-modal').addEventListener('click', closeTaskEditor);
  document.getElementById('cancel-btn').addEventListener('click', closeTaskEditor);
  document.getElementById('task-form').addEventListener('submit', saveTask);
  document.getElementById('search').addEventListener('input', filterTasks);
}

window.addEventListener('message', (event) => {
  const message = event.data;
  if (!message || !message.type) {
    return;
  }

  if (message.type === 'boardData') {
    applyBoardData(message.data);
    showLoading(false);
    hideError();
    return;
  }

  if (message.type === 'needsBoard') {
    showSetupMessage();
    showLoading(false);
    return;
  }

  if (message.type === 'boardError') {
    showLoading(false);
    showError(message.message || 'Failed to load board.');
    return;
  }

  if (message.type === 'externalChange') {
    requestBoard();
  }
});

function requestBoard() {
  showLoading(true);
  vscode.postMessage({ type: 'loadBoard' });
}

function showSetupMessage() {
  const container = document.getElementById('setup-container');
  container.innerHTML = `
    <div class="setup-message">
      <h2>Welcome to Kanban Board</h2>
      <p>To get started, please select your Kanbn board directory.</p>
      <p>Navigate to: <code>.kanbn</code></p>
      <button id="setup-select-btn">Select .kanbn Directory</button>
    </div>
  `;

  const button = document.getElementById('setup-select-btn');
  if (button) {
    button.addEventListener('click', () => {
      vscode.postMessage({ type: 'selectBoard' });
    });
  }
}

function applyBoardData(board) {
  state.board = board;
  state.tasks = new Map();

  for (const task of board.tasks) {
    state.tasks.set(task.name, task);
  }

  document.getElementById('setup-container').innerHTML = '';
  document.getElementById('board-title').textContent = board.title || 'Kanban Board';
  renderBoard();
}

function renderBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';

  const columnMap = state.board ? state.board.columnMap : {};
  const columns = state.board ? state.board.columns : state.columns;

  for (const columnName of columns) {
    const tasks = columnMap[columnName] || [];
    const columnEl = createColumnElement(columnName, tasks);
    boardEl.appendChild(columnEl);
  }
}

function createColumnElement(columnName, taskNames) {
  const column = document.createElement('div');
  column.className = 'column';
  column.dataset.column = columnName;

  if (columnName === 'In Progress') {
    column.classList.add('in-progress');
  } else if (columnName === 'Done') {
    column.classList.add('done');
  }

  const header = document.createElement('div');
  header.className = 'column-header';
  header.innerHTML = `
    <span class="column-title">${columnName}</span>
    <span class="column-count">${taskNames.length}</span>
  `;

  const taskList = document.createElement('div');
  taskList.className = 'task-list';

  taskList.addEventListener('dragover', handleDragOver);
  taskList.addEventListener('drop', (event) => handleDrop(event, columnName));

  for (const taskName of taskNames) {
    const task = state.tasks.get(taskName);
    if (task) {
      const taskCard = createTaskCard(task, columnName === 'Done');
      taskList.appendChild(taskCard);
    }
  }

  column.appendChild(header);
  column.appendChild(taskList);

  return column;
}

function createTaskCard(task, isDone) {
  const tags = normalizeTags(task.frontmatter.tags);
  const card = document.createElement('div');
  card.className = 'task-card';
  card.draggable = true;
  card.dataset.taskName = task.name;

  if (isDone) {
    card.classList.add('done', 'collapsed');
  }

  card.addEventListener('dragstart', handleDragStart);
  card.addEventListener('dragend', handleDragEnd);
  card.addEventListener('click', () => openTaskEditor(task.name));

  const title = document.createElement('div');
  title.className = 'task-title' + (isDone ? ' done' : '');
  title.textContent = task.title;

  card.appendChild(title);

  if (!isDone) {
    if (task.description) {
      const desc = document.createElement('div');
      desc.className = 'task-description';
      desc.textContent = task.description.substring(0, 150) + (task.description.length > 150 ? '...' : '');
      card.appendChild(desc);
    }

    const metadata = document.createElement('div');
    metadata.className = 'task-metadata';

    if (tags.length > 0) {
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'task-tags';

      for (const tag of tags) {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.textContent = tag;
        tagEl.style.backgroundColor = getTagColor(tag);
        tagEl.style.color = '#ffffff';
        tagsDiv.appendChild(tagEl);
      }

      metadata.appendChild(tagsDiv);
    }

    const dates = document.createElement('div');
    dates.className = 'task-dates';

    if (task.frontmatter.created) {
      dates.innerHTML += `📅 Created: ${formatDate(task.frontmatter.created)}<br>`;
    }
    if (task.frontmatter.updated) {
      dates.innerHTML += `🔄 Updated: ${formatDate(task.frontmatter.updated)}<br>`;
    }
    if (task.frontmatter.due) {
      dates.innerHTML += `⏰ Due: ${formatDate(task.frontmatter.due)}<br>`;
    }

    metadata.appendChild(dates);

    const progress = parseInt(task.frontmatter.progress, 10) || 0;
    if (progress > 0) {
      const progressDiv = document.createElement('div');
      progressDiv.className = 'task-progress';
      progressDiv.innerHTML = `
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      `;
      metadata.appendChild(progressDiv);
    }

    card.appendChild(metadata);
  } else if (task.frontmatter.completed) {
    const completedDiv = document.createElement('div');
    completedDiv.className = 'task-metadata';
    completedDiv.innerHTML = `📅 Completed: ${formatDate(task.frontmatter.completed)}`;
    card.appendChild(completedDiv);
  }

  return card;
}

function getTagColor(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 45%)`;
}

function formatDate(dateString) {
  if (!dateString) {
    return '';
  }
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

let draggedTask = null;

function handleDragStart(event) {
  draggedTask = event.target.dataset.taskName;
  event.target.classList.add('dragging');
}

function handleDragEnd(event) {
  event.target.classList.remove('dragging');
}

function handleDragOver(event) {
  event.preventDefault();
}

function handleDrop(event, targetColumn) {
  event.preventDefault();

  if (!draggedTask) {
    return;
  }

  const task = state.tasks.get(draggedTask);
  if (!task) {
    return;
  }

  const sourceColumn = task.column;
  if (sourceColumn === targetColumn) {
    return;
  }

  showLoading(true);
  vscode.postMessage({
    type: 'moveTask',
    taskName: draggedTask,
    fromColumn: sourceColumn,
    toColumn: targetColumn
  });

  draggedTask = null;
}

function openTaskEditor(taskName) {
  state.currentTask = taskName;

  const modal = document.getElementById('task-modal');
  const form = document.getElementById('task-form');

  if (taskName) {
    const task = state.tasks.get(taskName);
    document.getElementById('modal-title').textContent = 'Edit Task';
    document.getElementById('task-title-input').value = task.title;
    document.getElementById('task-assigned').value = task.frontmatter.assigned || '';
    document.getElementById('task-progress').value = parseInt(task.frontmatter.progress, 10) || 0;
    document.getElementById('task-due').value = task.frontmatter.due
      ? new Date(task.frontmatter.due).toISOString().slice(0, 16)
      : '';
    document.getElementById('task-tags').value = normalizeTags(task.frontmatter.tags).join(', ');
    document.getElementById('task-content').value = task.description || '';
  } else {
    document.getElementById('modal-title').textContent = 'New Task';
    form.reset();
  }

  modal.classList.add('visible');
}

function closeTaskEditor() {
  document.getElementById('task-modal').classList.remove('visible');
  state.currentTask = null;
}

function saveTask(event) {
  event.preventDefault();

  const title = document.getElementById('task-title-input').value.trim();
  const assigned = document.getElementById('task-assigned').value.trim();
  const progress = parseInt(document.getElementById('task-progress').value, 10) || 0;
  const dueInput = document.getElementById('task-due').value;
  const tags = document.getElementById('task-tags').value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag);
  const content = document.getElementById('task-content').value.trim();

  const due = dueInput ? new Date(dueInput).toISOString() : null;

  const payload = {
    title,
    assigned,
    progress,
    due,
    tags,
    content
  };

  showLoading(true);

  if (state.currentTask) {
    vscode.postMessage({
      type: 'updateTask',
      taskName: state.currentTask,
      data: payload
    });
  } else {
    vscode.postMessage({
      type: 'createTask',
      data: payload
    });
  }

  closeTaskEditor();
}

function filterTasks() {
  const query = document.getElementById('search').value.toLowerCase();
  const cards = document.querySelectorAll('.task-card');

  cards.forEach((card) => {
    const taskName = card.dataset.taskName;
    const task = state.tasks.get(taskName);

    if (!task) {
      return;
    }

    const searchText = [
      task.title,
      task.description,
      ...normalizeTags(task.frontmatter.tags)
    ]
      .join(' ')
      .toLowerCase();

    if (searchText.includes(query)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function showLoading(show) {
  document.getElementById('loading').classList.toggle('visible', show);
}

function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.textContent = message;
  errorEl.classList.add('visible');
}

function hideError() {
  document.getElementById('error').classList.remove('visible');
}

function normalizeTags(tags) {
  if (!tags) {
    return [];
  }
  return Array.isArray(tags) ? tags : [tags];
}
