# neo-memory-mcp

Simple Neo4j-backed memory MCP for coding agents (GitHub Copilot CLI, Claude CLI, etc).

No cloud. No markdown files. No over-engineering.  
Just Neo4j + local ONNX embeddings + 5 tools.

---

## How it works

Memories are graph nodes. Relationships between them are first-class citizens.  
Semantic recall uses a local embedding model (`BAAI/bge-small-en-v1.5`, ~33 MB, downloaded once and cached) — no external embedding service required.

```
(:Memory { id, content, type, scope, tags, created_at, embedding })
(:Project { name })

(:Memory)-[:RELATES_TO { relation }]->(:Memory)
(:Memory)-[:PART_OF]->(:Project)
```

---

## Requirements

- **Node.js** 18+
- **Neo4j** 5.x — [Desktop](https://neo4j.com/download/) or Docker:
  ```bash
  docker run -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:5
  ```

---

## Setup

```bash
git clone https://github.com/you/neo-memory-mcp
cd neo-memory-mcp
npm install
```

No `.env` file needed. Credentials are passed directly by the MCP client config (see below).

### Environment variables

| Variable          | Default                  | Description            |
|-------------------|--------------------------|------------------------|
| `NEO4J_URI`       | `bolt://localhost:7687`  | Neo4j Bolt URI         |
| `NEO4J_USER`      | `neo4j`                  | Neo4j username         |
| `NEO4J_PASSWORD`  | `password`               | Neo4j password         |

> **Local dev / testing:** pass them inline — `NEO4J_PASSWORD=secret npm run dev`

---

## Wiring into your agent

Credentials are injected via the `env` block — that's the only config you need.

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "neo-memory": {
      "command": "npx",
      "args": ["tsx", "/path/to/neo-memory-mcp/src/index.ts"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "password"
      }
    }
  }
}
```

### GitHub Copilot CLI (`.vscode/mcp.json`)

```json
{
  "servers": {
    "neo-memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "/path/to/neo-memory-mcp/src/index.ts"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "password"
      }
    }
  }
}
```

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
