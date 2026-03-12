import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { driver } from "../db.js";
import { embed } from "../embedder.js";

export function registerRecall(server: McpServer): void {
  server.tool(
    "recall",
    "Search memories by semantic similarity. Provide a descriptive query — the agent should " +
    "describe what it's looking for in natural language. Optionally filter by project scope.",
    {
      query: z
        .string()
        .describe("Natural language search query. Be descriptive for better semantic matching."),
      scope: z
        .string()
        .optional()
        .describe("Limit results to a project scope. Omit to search all memories including global."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .default(5)
        .describe("Maximum number of memories to return."),
    },
    async ({ query, scope, limit }) => {
      const session = driver.session();
      try {
        const queryEmbedding = await embed(query);
        let records;

        if (queryEmbedding) {
          // Vector similarity — primary path
          const scopeFilter = scope ? "WHERE m.scope = $scope OR m.scope = 'global'" : "";
          const result = await session.run(
            `CALL db.index.vector.queryNodes('memory_vector', $limit, $embedding)
             YIELD node AS m, score
             ${scopeFilter}
             RETURN m.id AS id, m.content AS content, m.type AS type,
                    m.scope AS scope, m.tags AS tags, m.created_at AS created_at, score
             ORDER BY score DESC`,
            { embedding: queryEmbedding, limit, ...(scope ? { scope } : {}) }
          );
          records = result.records;
        } else {
          // Full-text fallback
          const scopeFilter = scope ? "WHERE m.scope = $scope OR m.scope = 'global'" : "";
          const result = await session.run(
            `CALL db.index.fulltext.queryNodes('memory_fulltext', $query)
             YIELD node AS m, score
             ${scopeFilter}
             RETURN m.id AS id, m.content AS content, m.type AS type,
                    m.scope AS scope, m.tags AS tags, m.created_at AS created_at, score
             ORDER BY score DESC LIMIT $limit`,
            { query, limit, ...(scope ? { scope } : {}) }
          );
          records = result.records;
        }

        const memories = records.map((r) => ({
          id:         r.get("id"),
          content:    r.get("content"),
          type:       r.get("type"),
          scope:      r.get("scope"),
          tags:       r.get("tags"),
          created_at: r.get("created_at"),
          score:      r.get("score"),
        }));

        return {
          content: [{ type: "text", text: JSON.stringify(memories, null, 2) }],
        };
      } finally {
        await session.close();
      }
    }
  );
}
