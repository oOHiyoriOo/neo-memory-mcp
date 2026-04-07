import os from "os";
import path from "path";

/** Central config — read once from environment. */
export const config = {
  kuzu: {
    /**
     * Path to the KuzuDB database directory.
     * Defaults to ~/.local/share/neo-memory/db — shared across all projects.
     */
    dbPath: process.env.KUZU_DB_PATH ?? path.join(os.homedir(), ".local", "share", "neo-memory", "db"),
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
