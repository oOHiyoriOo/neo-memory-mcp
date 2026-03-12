import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { randomUUID } from "crypto";
import { driver } from "../db.js";
import { embed } from "../embedder.js";

export function registerRemember(server: McpServer): void {
  server.tool(
    "remember",
    "Store a new memory. Pick the most fitting type and provide tags to improve future recall.",
    {
      content: z.string().describe("The memory content to store."),
      type: z
        .enum(["decision", "pattern", "preference", "issue", "solution", "task", "context", "entity"])
        .optional()
        .default("context")
        .describe("Category of memory."),
      scope: z
        .string()
        .optional()
        .default("global")
        .describe("Project name this memory belongs to, or 'global' for cross-project knowledge."),
      tags: z
        .array(z.string())
        .optional()
        .default([])
        .describe("Short keywords to aid recall (e.g. ['typescript', 'esm', 'imports'])."),
    },
    async ({ content, type, scope, tags }) => {
      const id = randomUUID();
      const created_at = new Date().toISOString();
      const embedding = await embed(content);

      const session = driver.session();
      try {
        if (scope !== "global") {
          await session.run("MERGE (p:Project {name: $name})", { name: scope });
        }

        // Conditionally include embedding field only when available
        const embeddingClause = embedding ? ", embedding: $embedding" : "";
        await session.run(
          `CREATE (m:Memory {
            id: $id, content: $content, type: $type,
            scope: $scope, tags: $tags, created_at: $created_at
            ${embeddingClause}
          })`,
          { id, content, type, scope, tags, created_at, ...(embedding ? { embedding } : {}) }
        );

        if (scope !== "global") {
          await session.run(
            `MATCH (m:Memory {id: $id}), (p:Project {name: $scope})
             CREATE (m)-[:PART_OF]->(p)`,
            { id, scope }
          );
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ id, content, type, scope, tags, created_at, embedded: embedding !== null }),
          }],
        };
      } finally {
        await session.close();
      }
    }
  );
}
