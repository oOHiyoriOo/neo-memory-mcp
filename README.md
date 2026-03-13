# neo-memory-mcp

Simple KuzuDB-backed memory MCP for coding agents (GitHub Copilot CLI, Claude CLI, etc).

No cloud. No markdown files. No external server. No over-engineering.  
Just KuzuDB (embedded) + local ONNX embeddings + 5 tools.

---

## How it works

Memories are graph nodes. Relationships between them are first-class citizens.  
Semantic recall uses a local embedding model (`BAAI/bge-small-en-v1.5`, ~33 MB, downloaded once and cached to `~/.cache/fastembed`) — no external embedding service required.

The database is an embedded [KuzuDB](https://github.com/kuzudb/kuzu) graph stored in `~/.local/share/neo-memory/db` by default. No server to run, no credentials to manage.

```
(:Memory { id, content, type, scope, tags, created_at, embedding })
(:Project { name })

(:Memory)-[:RELATES_TO { relation }]->(:Memory)
(:Memory)-[:PART_OF]->(:Project)
```

---

## Requirements

- **Node.js** 18+

That's it. No database server required.

---

## Setup

```bash
git clone https://github.com/you/neo-memory-mcp
cd neo-memory-mcp
npm install
```

No `.env` file needed. Credentials are passed directly by the MCP client config (see below).

### Environment variables

| Variable        | Default                               | Description                       |
|-----------------|---------------------------------------|-----------------------------------|
| `KUZU_DB_PATH`  | `~/.local/share/neo-memory/db`        | Path to the KuzuDB database dir   |

> **Override example:** `KUZU_DB_PATH=/data/my-memory npm run dev`

---

## Wiring into your agent

No credentials needed — just point at the script.

### Claude Desktop (`claude_desktop_config.json`)

**Linux / macOS**
```json
{
  "mcpServers": {
    "neo-memory": {
      "command": "npx",
      "args": ["tsx", "/path/to/neo-memory-mcp/src/index.ts"]
    }
  }
}
```

**Windows** — `npx` must be the full path (cmd/PowerShell don't resolve it otherwise):
```json
{
  "mcpServers": {
    "neo-memory": {
      "command": "C:\\Program Files\\nodejs\\npx.cmd",
      "args": ["tsx", "C:\\path\\to\\neo-memory-mcp\\src\\index.ts"]
    }
  }
}
```

### GitHub Copilot CLI (`.vscode/mcp.json`)

**Linux / macOS**
```json
{
  "servers": {
    "neo-memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "/path/to/neo-memory-mcp/src/index.ts"]
    }
  }
}
```

**Windows**
```json
{
  "servers": {
    "neo-memory": {
      "type": "stdio",
      "command": "C:\\Program Files\\nodejs\\npx.cmd",
      "args": ["tsx", "C:\\path\\to\\neo-memory-mcp\\src\\index.ts"]
    }
  }
}
```

> **Tip:** find your npx path on Windows with `where npx` in a terminal.

### Agent instructions

The MCP tools alone aren't enough — the agent needs to know *when* and *how* to use them.  
Copy the contents of [`AGENT_INSTRUCTIONS.md`](./AGENT_INSTRUCTIONS.md) into your agent's system prompt / custom instructions block.

This tells the agent to:
- Recall context at the start of every session
- Store memories continuously as work happens (not just at the end)
- Connect related memories into a graph
- Leave every session more useful than it found it

Without this, most agents will technically have access to the tools but use them rarely or only when explicitly asked.

---

## Tools

### `remember`
Store a new memory.

| Param     | Type       | Required | Description |
|-----------|------------|----------|-------------|
| `content` | `string`   | ✅       | The memory content |
| `type`    | `enum`     | —        | `decision` \| `pattern` \| `preference` \| `issue` \| `solution` \| `task` \| `context` \| `entity` |
| `scope`   | `string`   | —        | Project name or `"global"` (default) |
| `tags`    | `string[]` | —        | Keywords to aid recall |

---

### `recall`
Semantic similarity search. The agent provides a natural language query; the most relevant memories are returned ranked by cosine similarity.

| Param   | Type     | Required | Description |
|---------|----------|----------|-------------|
| `query` | `string` | ✅       | Descriptive search query |
| `scope` | `string` | —        | Filter to a project (also returns global memories) |
| `limit` | `number` | —        | Max results, default `5` |

Falls back to full-text search if the embedding model fails to initialise.

---

### `connect`
Create a named directional relationship between two memories.

| Param      | Type     | Required | Description |
|------------|----------|----------|-------------|
| `from_id`  | `string` | ✅       | Source memory ID |
| `to_id`    | `string` | ✅       | Target memory ID |
| `relation` | `string` | ✅       | e.g. `caused`, `solved_by`, `depends_on`, `contradicts` |

---

### `forget`
Delete a memory and all its relationships.

| Param | Type     | Required | Description |
|-------|----------|----------|-------------|
| `id`  | `string` | ✅       | Memory ID to delete |

---

### `explore`
Traverse the graph outward from a memory node. Returns all connected nodes and edges up to the specified depth.

| Param   | Type     | Required | Description |
|---------|----------|----------|-------------|
| `id`    | `string` | ✅       | Starting memory ID |
| `depth` | `number` | —        | Hops to traverse, default `2`, max `5` |

---

## Memory types

| Type         | Use for |
|--------------|---------|
| `decision`   | Architectural / design choices and their rationale |
| `pattern`    | Coding conventions and patterns to follow |
| `preference` | User preferences (tools, style, workflow) |
| `issue`      | Known bugs, gotchas, pain points |
| `solution`   | How a past issue was resolved |
| `task`       | Ongoing / pending work across sessions |
| `context`    | General project background |
| `entity`     | Person, team, technology, external system |
