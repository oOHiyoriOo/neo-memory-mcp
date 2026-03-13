import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { randomUUID } from "crypto";
import { runQuery } from "../db.js";
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

      if (scope !== "global") {
        // MERGE ensures the Project node exists without duplicating it
        await runQuery("MERGE (p:Project {name: $name})", { name: scope });
      }

      await runQuery(
        `CREATE (:Memory {
          id: $id, content: $content, type: $type,
          scope: $scope, tags: $tags, created_at: $created_at,
          embedding: $embedding
        })`,
        { id, content, type, scope, tags: tags.length > 0 ? tags : null, created_at, embedding }
      );

      if (scope !== "global") {
        await runQuery(
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
    }
  );
}
