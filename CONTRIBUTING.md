# Contributing to Kanban Board Viewer

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Browser and OS information
- Screenshots if applicable

### Suggesting Features

Feature requests are welcome! Please:
- Check if the feature has already been requested
- Provide a clear use case
- Explain how it would benefit users
- Consider implementation complexity

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**
4. **Test thoroughly** in multiple browsers
5. **Commit with clear messages**: `git commit -m "Add feature: description"`
6. **Push to your fork**: `git push origin feature/your-feature-name`
7. **Open a Pull Request**

## Development Guidelines

### Code Style

- Use consistent indentation (2 spaces)
- Follow existing code patterns
- Add comments for complex logic
- Keep functions focused and small

### Testing

Before submitting a PR, test your changes in:
- Chrome (latest)
- Edge (latest)
- Opera (if possible)
- VSCode Simple Browser

Test these scenarios:
- Loading a board with many tasks (100+)
- Drag and drop between columns
- Creating new tasks
- Editing existing tasks
- Search/filter functionality
- Light and dark themes

### Documentation

- Update README.md if adding features
- Update AGENT_INSTRUCTIONS.md if changing file format
- Add inline comments for complex code
- Include examples where helpful

## Project Structure

```
kanban-board-viewer/
├── kanban-board.html         # Main application (single file)
├── AGENT_INSTRUCTIONS.md     # Agent documentation
├── README.md                 # User documentation
├── LICENSE                   # MIT License
├── CONTRIBUTING.md           # This file
└── .gitignore               # Git ignore rules
```

## Technical Considerations

### File System Access API

- The app uses the File System Access API
- Only works in Chromium-based browsers
- Requires user permission for each session
- Direct file access (no server needed)

### Single File Architecture

- Everything is in `kanban-board.html`
- No build process or dependencies
- Embedded CSS and JavaScript
- Easy to distribute and use

### Kanbn Compatibility

- Must maintain compatibility with Kanbn file format
- YAML frontmatter parsing must be robust
- Preserve existing file structure
- Don't break existing Kanbn boards

## Areas for Contribution

### High Priority

- [ ] Keyboard shortcuts
- [ ] Task deletion functionality
- [ ] Undo/redo support
- [ ] Export/import features
- [ ] Customizable tag colors

### Medium Priority

- [ ] Task templates
- [ ] Bulk operations
- [ ] Advanced filtering
- [ ] Task dependencies
- [ ] Sprint management

### Low Priority

- [ ] Themes/customization
- [ ] Plugins/extensions
- [ ] Mobile support (if File System Access API becomes available)

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Collaborate openly

## Questions?

If you have questions about contributing, feel free to:
- Open an issue for discussion
- Ask in pull request comments
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make Kanban Board Viewer better! 🎉
