import * as vscode from 'vscode';
import { readFileSync } from 'fs';
import { BoardData, KanbnStore } from './kanbn';

const STORAGE_KEY = 'kanbanBoardViewer.lastBoardPath';

export function activate(context: vscode.ExtensionContext) {
  let panel: vscode.WebviewPanel | undefined;
  let store: KanbnStore | undefined;
  let watcher: vscode.FileSystemWatcher | undefined;
  let suppressWatchUntil = 0;

  const openBoardCommand = vscode.commands.registerCommand('kanbanBoardViewer.openBoard', async () => {
    const selection = await pickBoardDirectory();
    if (selection) {
      await context.globalState.update(STORAGE_KEY, selection.fsPath);
      store = new KanbnStore(selection);
      startWatcher(selection);
    }

    if (!panel) {
      panel = createWebviewPanel(context);
      attachMessageHandler(panel);
    }

    panel.reveal();

    if (store) {
      await sendBoardData(panel, store);
    } else {
      await sendNeedsBoard(panel);
    }
  });

  context.subscriptions.push(openBoardCommand);

  function createWebviewPanel(ctx: vscode.ExtensionContext): vscode.WebviewPanel {
    const newPanel = vscode.window.createWebviewPanel(
      'kanbanBoardViewer.board',
      'Kanban Board Viewer',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(ctx.extensionUri, 'media')]
      }
    );

    setWebviewHtml(newPanel.webview, ctx.extensionUri);
    newPanel.onDidDispose(() => {
      panel = undefined;
    });

    return newPanel;
  }

  function setWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri) {
    const nonce = getNonce();
    const htmlPath = vscode.Uri.joinPath(extensionUri, 'media', 'kanban-board.html');
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'kanban-board.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'kanban-board.js'));

    let html = readFileSync(htmlPath.fsPath, 'utf8');
    html = html.replace(/\{\{nonce\}\}/g, nonce);
    html = html.replace(/\{\{cspSource\}\}/g, webview.cspSource);
    html = html.replace(/\{\{styleUri\}\}/g, styleUri.toString());
    html = html.replace(/\{\{scriptUri\}\}/g, scriptUri.toString());
    webview.html = html;
  }

  function attachMessageHandler(targetPanel: vscode.WebviewPanel) {
    targetPanel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'ready') {
        const storedPath = context.globalState.get<string>(STORAGE_KEY);
        if (storedPath) {
          const uri = vscode.Uri.file(storedPath);
          store = new KanbnStore(uri);
          startWatcher(uri);
          await sendBoardData(targetPanel, store);
        } else {
          await sendNeedsBoard(targetPanel);
        }
        return;
      }

      if (message.type === 'selectBoard') {
        const selected = await pickBoardDirectory();
        if (!selected) {
          return;
        }
        await context.globalState.update(STORAGE_KEY, selected.fsPath);
        store = new KanbnStore(selected);
        startWatcher(selected);
        await sendBoardData(targetPanel, store);
        return;
      }

      if (message.type === 'loadBoard') {
        if (store) {
          await sendBoardData(targetPanel, store);
        } else {
          await sendNeedsBoard(targetPanel);
        }
        return;
      }

      if (!store) {
        await sendNeedsBoard(targetPanel);
        return;
      }

      if (message.type === 'moveTask') {
        suppressWatchUntil = Date.now() + 750;
        await store.moveTask(message.taskName, message.fromColumn, message.toColumn);
        await sendBoardData(targetPanel, store);
        return;
      }

      if (message.type === 'updateTask') {
        suppressWatchUntil = Date.now() + 750;
        await store.updateTask(message.taskName, message.data);
        await sendBoardData(targetPanel, store);
        return;
      }

      if (message.type === 'createTask') {
        suppressWatchUntil = Date.now() + 750;
        await store.createTask(message.data);
        await sendBoardData(targetPanel, store);
      }
    });
  }

  async function pickBoardDirectory(): Promise<vscode.Uri | null> {
    const selection = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select Kanbn Board'
    });

    if (!selection || selection.length === 0) {
      return null;
    }

    const resolved = await KanbnStore.resolveKanbnDir(selection[0]);
    if (!resolved) {
      void vscode.window.showErrorMessage('Selected folder is not a valid .kanbn directory.');
      return null;
    }

    return resolved;
  }

  function startWatcher(kanbnDir: vscode.Uri) {
    watcher?.dispose();
    watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(kanbnDir, '**/*')
    );

    const onChange = () => {
      if (!panel) {
        return;
      }
      if (Date.now() < suppressWatchUntil) {
        return;
      }
      panel.webview.postMessage({ type: 'externalChange' });
    };

    watcher.onDidChange(onChange);
    watcher.onDidCreate(onChange);
    watcher.onDidDelete(onChange);
  }

  async function sendBoardData(targetPanel: vscode.WebviewPanel, targetStore: KanbnStore) {
    try {
      const data = await targetStore.loadBoard();
      targetPanel.webview.postMessage({ type: 'boardData', data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load board.';
      targetPanel.webview.postMessage({ type: 'boardError', message });
    }
  }

  async function sendNeedsBoard(targetPanel: vscode.WebviewPanel) {
    targetPanel.webview.postMessage({ type: 'needsBoard' });
  }

  context.subscriptions.push({
    dispose: () => {
      watcher?.dispose();
    }
  });
}

export function deactivate() {}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 16; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
