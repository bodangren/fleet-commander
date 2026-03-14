# Kanban Conductor

A local-first Electron application that visualizes the `conductor/` directory as a Kanban board and acts as a Command Center for multi-agent development.

## Features

- **Kanban Board**: Bi-directional synced board representing the `conductor/tracks.md` registry
- **Interactive Plan Editor**: Side-panel view for `plan.md` with interactive checkboxes
- **Agent Mapping**: Map custom agent tags (e.g., `@gemini`, `@claude`) to terminal commands
- **Integrated Terminal**: Built-in terminal (xterm.js + node-pty) to interact with CLI agents
- **Real-time Sync**: UI actions immediately update Markdown source files

## Tech Stack

- **Desktop**: Electron with Node.js main process
- **Frontend**: React (Vite) + Tailwind CSS + Shadcn UI
- **Terminal**: xterm.js + node-pty
- **Database**: better-sqlite3
- **Language**: TypeScript

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Lint and type check
npm run check

# Build for production
npm run build
```

## Project Structure

```
src/
├── main/          # Electron main process (Node environment)
├── preload/       # Preload scripts for IPC bridging
├── renderer/      # React UI (Vite)
└── shared/        # Shared types/parsers
conductor/
├── product.md     # Product vision and features
├── tech-stack.md  # Technology choices
├── workflow.md    # Development workflow
├── tracks.md      # Master list of tracks
└── tracks/        # Individual track directories
```

## License

ISC
