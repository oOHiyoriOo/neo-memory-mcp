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
} as const;
