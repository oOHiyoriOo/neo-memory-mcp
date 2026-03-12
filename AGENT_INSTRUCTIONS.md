## Memory (neo-memory MCP)

You have access to a persistent memory graph backed by Neo4j. Use it proactively — do not wait to be asked.

### When to recall
- **At the start of every session** — call `recall` with a description of the current project and task to surface relevant context before writing a single line of code.
- **Before solving a problem** — search for similar past issues, decisions, or solutions that might already exist.
- **When you encounter something unfamiliar** — check if there's prior context about it.

### When to remember
- Any **architectural or design decision** made during the session (`type: decision`).
- **Patterns and conventions** established or discovered in the codebase (`type: pattern`).
- **User preferences** about tools, style, workflow, or communication (`type: preference`).
- **Bugs and issues** encountered, even if not yet solved (`type: issue`).
- **Solutions** to non-obvious problems — especially workarounds (`type: solution`).
- **Tasks left unfinished** at the end of a session (`type: task`).

### When to connect
After storing two related memories, call `connect` to link them — e.g. an `issue` node connected to its `solution` with relation `solved_by`, or a `decision` connected to the `pattern` it produced with `led_to`. Relationships are what make the graph useful over time.

### When to explore
When context around a memory feels incomplete, call `explore` to traverse its connections. A single node often unlocks a cluster of related decisions, issues, and solutions.

### When to forget
If the user tells you a memory is wrong, outdated, or should be removed: `recall` it first to get its ID, then call `forget` to permanently delete it and all its relationships. Always confirm with the user before deleting.

### Scope
Always set `scope` to the current repository or project name (e.g. `neo-memory-mcp`) for project-specific memories. Use `scope: global` for preferences and patterns that apply everywhere.

### Mindset
Treat memory as a first-class part of your work — the same way you read files before editing them, recall before acting. Every session should leave the graph slightly more useful than it found it.
