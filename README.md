# Kanban Board Viewer

A standalone HTML Kanban board viewer for [Kanbn](https://github.com/basementuniverse/kanbn) markdown files. Works in any modern browser with File System Access API support.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
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

### 1. Download

Download `kanban-board.html` from this repository.

### 2. Open in Browser

**Option A: Simple Browser (VSCode/Antigravity)**
- Right-click `kanban-board.html`
- Select "Open with Simple Browser"

**Option B: External Browser**
- Open Chrome, Edge, or Opera
- Drag `kanban-board.html` into the browser window

### 3. Select Your Board

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
| VSCode Simple Browser | ✅ Full Support |
| Antigravity Simple Browser | ✅ Full Support |
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

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built for compatibility with [Kanbn](https://github.com/basementuniverse/kanbn) by basementuniverse
- Inspired by the [Kanbn VSCode Extension](https://github.com/samgiz/vscode-kanbn) by samgiz

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Made with ❤️ for the Kanbn community**
