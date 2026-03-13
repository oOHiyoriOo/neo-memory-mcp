## Memory (neo-memory MCP)

You have access to a persistent memory graph backed by Neo4j.
**Memory is not optional.** It is a core part of how you work. Use it continuously — before, during, and after every task.

---

### Session start — always do this first

Before writing a single line of code or answering any technical question:
1. Call `recall` with the project name and a short description of the current task.
2. Review what comes back — past decisions, known issues, patterns, unfinished tasks.
3. Let that context shape your approach.

> Skipping this step means working blind. Don't.

---

### During the session — remember as you go

**Do not save everything at the end.** Store memories the moment they become clear.  
When in doubt, store it. A slightly redundant memory costs nothing; a lost insight costs a future session.

Store a memory whenever you:
- Make or discover an **architectural or design decision** — even small ones (`type: decision`)
- Notice a **coding pattern or convention** in the codebase (`type: pattern`)
- Hit a **bug, gotcha, or surprising behaviour** — even if you fix it immediately (`type: issue`)
- Find a **non-obvious solution or workaround** (`type: solution`)
- Learn a **user preference** about tools, style, naming, workflow, or communication (`type: preference`)
- Complete a task — store **what was changed and why** (`type: context`)
- Leave something **unfinished or deferred** (`type: task`)
- Learn anything about the **project structure, tech stack, or external dependencies** (`type: context`)

**Examples of things that should always be stored:**
- "Fixed fastembed defaulting to a relative `local_cache/` path — now uses `~/.cache/fastembed`."
- "User prefers sarcastic tone in responses."
- "Neo4j connection is configured via env vars, not a .env file."
- "Embedding model is BAAI/bge-small-en-v1.5, ~33 MB, downloaded once."
- "tsconfig targets ES2022, output goes to dist/."

---

### Connect related memories

After storing two memories that are related, call `connect` to link them:
- `issue` → `solution` with relation `solved_by`
- `decision` → `pattern` with relation `led_to`
- `task` → `context` with relation `relates_to`
- `bug` → `workaround` with relation `fixed_by`

Relationships turn isolated facts into a knowledge graph. They are what make recall useful over time.

---

### Recall before solving

Before tackling any non-trivial problem, call `recall` with a description of the problem.  
You may have already solved something similar. The user may have already expressed a preference about the approach.

---

### Explore when context feels thin

When a recalled memory feels incomplete or references something you don't fully understand, call `explore` on its ID to traverse its connections. One node often unlocks a cluster of related context.

---

### Forget when corrected

If the user says a memory is wrong or outdated: `recall` it to get the ID, then `forget` it. Always confirm before deleting. Replace it with a corrected memory.

---

### Scope

- Project-specific memories → `scope: <repo-or-project-name>` (e.g. `neo-memory-mcp`)
- Cross-project preferences and patterns → `scope: global`

---

### Mindset

You are building a living knowledge base on behalf of the user.
Every session should leave the graph measurably more useful than it found it.
The goal is that future-you (in a completely blank context window) can `recall` and immediately understand the project, its quirks, and the user's preferences — without asking a single question.
