# Product Guidelines - Measure Command Center

## Prose Style & Tone
- **Technical & Precise:** All interface copy (labels, buttons, tooltips) must use industry-standard developer terminology. 
- **Voice:** Direct and utilitarian. Avoid marketing fluff or overly conversational language. 
- **Terse Feedback:** Success messages should be brief (e.g., "Track created"), and error messages must be actionable and specific (e.g., "Failed to write plan.md: Permission denied").

## User Experience (UX) Principles
- **Project Overview vs. Task Execution:** The primary view is a Kanban board for project state visualization. However, the system must provide a high-efficiency transition (e.g., via hotkeys or a prominent "Focus" button) to the "Active Task" view.
- **Active Task Focus:** When focusing on a task, the terminal and the specific task description should dominate the viewport, minimizing board-level distractions.
- **Low Latency Sync:** Every UI action (checking a box, moving a card) must trigger an immediate file-system update to ensure the Markdown files remain the source of truth without manual saving.
- **Keyboard First:** All core navigation (switching columns, opening cards, launching agents) must be accessible via keyboard shortcuts.

## Visual Identity
- **Dark Mode Default:** A high-contrast dark theme is the primary interface to reduce eye strain during long development sessions.
- **Information Density:** Prioritize showing more data (logs, task status, agent metadata) over whitespace.
- **Typography:** Monospace fonts are mandatory for all file content, terminal output, and agent tags to maintain a consistent developer tool aesthetic.
- **Status Indicators:** Use distinct, minimal color coding for agent states (e.g., Pulse Green for active, Static Gray for idle, Amber for pending input).

## Safety & Quality Standards
- **Destructive Action Confirmation:** Deleting tracks or force-terminating agents requires explicit user confirmation.
- **File Integrity:** Before writing to Markdown files, the system should perform a quick validation to ensure it doesn't corrupt existing frontmatter or structured task lists.
