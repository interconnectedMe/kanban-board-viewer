import * as vscode from 'vscode';
import { BoardData, KanbnStore } from './kanbn';

const STORAGE_KEY = 'kanbanBoardViewer.lastBoardPath';
const textDecoder = new TextDecoder('utf-8');

let externalServer: import('http').Server | undefined;
let externalServerPort: number | undefined;

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

  const openExternalCommand = vscode.commands.registerCommand('kanbanBoardViewer.openExternal', async () => {
    try {
      const port = await ensureExternalViewerServer(context);
      const url = `http://127.0.0.1:${port}/kanban-board.html`;
      await vscode.env.openExternal(vscode.Uri.parse(url));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open external viewer.';
      void vscode.window.showErrorMessage(message);
    }
  });

  const diagnosticsCommand = vscode.commands.registerCommand('kanbanBoardViewer.openDiagnostics', async () => {
    const diagnosticsPanel = vscode.window.createWebviewPanel(
      'kanbanBoardViewer.diagnostics',
      'Kanban Board Viewer: Diagnostics',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    diagnosticsPanel.webview.html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="font-family: sans-serif; padding: 16px;">
    <h2>Webview Diagnostics</h2>
    <p>If you can see this, basic webviews render.</p>
    <pre id="out"></pre>
    <script>
      const out = document.getElementById('out');
      out.textContent =
        'location.origin: ' + location.origin + '\\n' +
        'isSecureContext: ' + (typeof isSecureContext !== 'undefined' ? isSecureContext : 'n/a') + '\\n' +
        'serviceWorker in navigator: ' + ('serviceWorker' in navigator) + '\\n' +
        'userAgent: ' + navigator.userAgent + '\\n';
    </script>
  </body>
</html>`;
  });

  context.subscriptions.push(openBoardCommand, openExternalCommand, diagnosticsCommand);

  function createWebviewPanel(ctx: vscode.ExtensionContext): vscode.WebviewPanel {
    const newPanel = vscode.window.createWebviewPanel(
      'kanbanBoardViewer.board',
      'Kanban Board Viewer',
      vscode.ViewColumn.One,
      {
        enableScripts: true
      }
    );

    void setWebviewHtml(newPanel.webview, ctx.extensionUri);
    newPanel.onDidDispose(() => {
      panel = undefined;
    });

    return newPanel;
  }

  async function setWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri) {
    const htmlPath = vscode.Uri.joinPath(extensionUri, 'media', 'kanban-board.html');
    const cssPath = vscode.Uri.joinPath(extensionUri, 'media', 'kanban-board.css');
    const jsPath = vscode.Uri.joinPath(extensionUri, 'media', 'kanban-board.js');

    const [htmlBytes, cssBytes, jsBytes] = await Promise.all([
      vscode.workspace.fs.readFile(htmlPath),
      vscode.workspace.fs.readFile(cssPath),
      vscode.workspace.fs.readFile(jsPath)
    ]);

    const css = textDecoder.decode(cssBytes);
    const js = textDecoder.decode(jsBytes);

    let html = textDecoder.decode(htmlBytes);
    html = html.replace(/<meta[^>]+http-equiv=\"Content-Security-Policy\"[^>]*>/i, '');
    html = html.replace(/\{\{cspSource\}\}/g, webview.cspSource);
    html = html.replace(/<link\s+rel=\"stylesheet\"\s+href=\"\{\{styleUri\}\}\">\s*/i, `<style>\n${css}\n</style>\n`);
    html = html.replace(/<script[^>]*src=\"\{\{scriptUri\}\}\"[^>]*>\s*<\/script>\s*/i, `<script>\n${js}\n</script>\n`);
    html = html.replace(/\{\{nonce\}\}/g, '');
    html = html.replace(/\{\{styleUri\}\}/g, '');
    html = html.replace(/\{\{scriptUri\}\}/g, '');
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
    if (resolved) {
      return resolved;
    }

    const choice = await vscode.window.showInformationMessage(
      'No Kanbn board found here. Create a new Kanbn board structure?',
      { modal: true },
      'Create',
      'Cancel'
    );
    if (choice !== 'Create') {
      return null;
    }

    return KanbnStore.ensureKanbnDir(selection[0]);
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
      externalServer?.close();
      externalServer = undefined;
      externalServerPort = undefined;
    }
  });
}

export function deactivate() {}

async function ensureExternalViewerServer(ctx: vscode.ExtensionContext): Promise<number> {
  if (externalServer && externalServerPort) {
    return externalServerPort;
  }

  let http: typeof import('http');
  try {
    http = await import('http');
  } catch {
    throw new Error('External viewer requires a Node-based extension host (http server unavailable).');
  }

  externalServer = http.createServer(async (req, res) => {
    try {
      const rawUrl = req.url || '/';
      const pathname = rawUrl.split('?')[0] || '/';
      const decodedPath = decodeURIComponent(pathname);
      const safePath = decodedPath.startsWith('/') ? decodedPath.slice(1) : decodedPath;
      const normalized = safePath.replace(/\\/g, '/');

      if (!normalized || normalized === '/') {
        res.statusCode = 302;
        res.setHeader('Location', '/kanban-board.html');
        res.end();
        return;
      }

      if (normalized.includes('..')) {
        res.statusCode = 400;
        res.end('Bad request');
        return;
      }

      if (normalized !== 'kanban-board.html') {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      const fileUri = vscode.Uri.joinPath(ctx.extensionUri, 'kanban-board.html');
      const bytes = await vscode.workspace.fs.readFile(fileUri);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(bytes);
    } catch {
      res.statusCode = 500;
      res.end('Internal error');
    }
  });

  externalServerPort = await new Promise<number>((resolve, reject) => {
    externalServer?.listen(0, '127.0.0.1', () => {
      const address = externalServer?.address();
      if (typeof address === 'object' && address && typeof address.port === 'number') {
        resolve(address.port);
      } else {
        reject(new Error('Failed to start local server.'));
      }
    });
    externalServer?.on('error', reject);
  });

  return externalServerPort;
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 16; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
