# Kanban Board Viewer

A VS Code/Antigravity webview extension and standalone HTML Kanban board viewer for [Kanbn](https://github.com/basementuniverse/kanbn) markdown files.

![License](https://img.shields.io/badge/license-GPLv3-blue.svg)
![Browser](https://img.shields.io/badge/browser-Chrome%20%7C%20Edge%20%7C%20Opera-green.svg)

## Features

- 📁 **File System Access API** - Direct read/write to your Kanbn markdown files
- 🎨 **Modern UI** - Clean, responsive design with automatic light/dark theme
- 🔄 **Drag & Drop** - Move tasks between columns with ease
- ✏️ **Task Editor** - Create and edit tasks with full metadata support
- 🏷️ **Smart Tags** - Auto-generated colors for consistent visual organization
- 📊 **Progress Tracking** - Visual progress bars and completion status
- 🔍 **Search & Filter** - Quickly find tasks by title, description, or tags
- 🤖 **Agent-Friendly** - Comprehensive instructions for AI assistants

## Quick Start

### VS Code / Antigravity Extension

1. Build the extension:
   - `npm install`
   - `npm run compile`
2. Open the command palette and run: `Kanban Board Viewer: Open Board`
3. Select your `.kanbn` folder (or a parent folder containing `.kanbn`)

The extension uses VS Code file APIs, so it works in VS Code and Antigravity without relying on the File System Access API.

### Standalone HTML Viewer

#### 1. Download

Download `kanban-board.html` from this repository.

#### 2. Open in Browser

The File System Access API works best from a secure context like `http://localhost` (recommended) and requires a top-level browsing context (not an embedded preview).

**Option A: External Browser (recommended)**
1. In a terminal, start a local server in the folder containing `kanban-board.html`:
   - `python3 -m http.server 8000`
2. Open Chrome / Edge / Opera to `http://localhost:8000/kanban-board.html`

**Option B: Open the file directly**
- You can try opening `kanban-board.html` via `file://` (or dragging it into the browser), but if you don't see the directory picker button working, use Option A or B.

#### 3. Select Your Board

1. Click "Select .kanbn Directory"
2. Navigate to your Kanbn board's `.kanbn` folder
3. Grant file system permission
4. Start managing your tasks!

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full Support |
| Edge | ✅ Full Support |
| Opera | ✅ Full Support |
| VSCode Simple Browser | ❌ File picker blocked (embedded preview) |
| Antigravity Simple Browser | ❌ File picker blocked (embedded preview) |
| Firefox | ⚠️ Limited Support |
| Safari | ❌ Not Supported |

## Features in Detail

### Board View
- **5 Columns**: Backlog, Ready, In Progress, Review, Done
- **Task Cards**: Display title, description, tags, dates, and progress
- **Done Column**: Collapsed cards showing only essentials
- **Real-time Search**: Filter tasks as you type

### Task Management
- **Drag & Drop**: Move tasks between columns
- **Auto-timestamps**: Automatically adds `started` and `completed` dates
- **Progress Tracking**: 0-100% progress bars
- **Tag System**: Color-coded tags for easy categorization

### Task Editor
- Edit task title, content, and metadata
- Set due dates, assignees, and progress
- Add and manage tags
- Full markdown support for task content

## File Structure

Your Kanbn board structure remains unchanged:

```
your-project/
├── .kanbn/
│   ├── index.md              # Board structure
│   └── tasks/                # Individual task files
│       ├── task-1.md
│       ├── task-2.md
│       └── ...
└── kanban-board.html         # ← Place the viewer here
```

## For AI Agents

See [AGENT_INSTRUCTIONS.md](AGENT_INSTRUCTIONS.md) for comprehensive documentation on:
- Creating tasks programmatically
- Moving tasks between columns
- Updating task metadata
- File format specifications
- Validation rules

## Technical Details

- **Single File**: Everything in one HTML file (~800 lines)
- **No Dependencies**: Pure HTML, CSS, and JavaScript
- **No Server Required**: Runs entirely in the browser
- **Git-Compatible**: Works with plain markdown files
- **Offline-First**: No internet connection needed

## Limitations

- Requires File System Access API (Chrome, Edge, Opera)
- Desktop browsers only (mobile not supported)
- No undo/redo functionality
- No real-time multi-user sync
- Permission required each browser session

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

GPL-3.0 License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built for compatibility with [Kanbn](https://github.com/basementuniverse/kanbn) by basementuniverse
- Inspired by the [Kanbn VSCode Extension](https://github.com/samgiz/vscode-kanbn) by samgiz

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Made with ❤️ for the Kanbn community**
