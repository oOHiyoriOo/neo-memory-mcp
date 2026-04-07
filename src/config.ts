/** Central config — read once from environment. */
export const config = {
  neo4j: {
    uri:      process.env.NEO4J_URI      ?? "bolt://localhost:7687",
    user:     process.env.NEO4J_USER     ?? "neo4j",
    password: process.env.NEO4J_PASSWORD ?? "password",
  },
  http: {
    /**
     * When set, the server runs as an HTTP daemon on this port instead of stdio.
     * All MCP clients connect to http://localhost:<port>/mcp — one DB connection shared.
     * Example: HTTP_PORT=3742 node dist/index.js
     */
    port: process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : undefined,
  },
} as const;
