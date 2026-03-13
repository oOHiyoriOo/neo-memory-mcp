import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runQuery } from "../db.js";
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
      const queryEmbedding = await embed(query);
      const scopeFilter = scope ? "WHERE node.scope = $scope OR node.scope = 'global'" : "";
      let rows: Record<string, any>[];

      if (queryEmbedding) {
        // Primary path: vector similarity search via HNSW index
        rows = await runQuery(
          `CALL QUERY_VECTOR_INDEX('Memory', 'memory_vec', $embedding, $limit)
           YIELD node, distance
           ${scopeFilter}
           RETURN node.id AS id, node.content AS content, node.type AS type,
                  node.scope AS scope, node.tags AS tags, node.created_at AS created_at,
                  1.0 - distance AS score
           ORDER BY score DESC`,
          { embedding: queryEmbedding, limit, ...(scope ? { scope } : {}) }
        );
      } else {
        // Fallback: full-text BM25 search when embedder is unavailable
        rows = await runQuery(
          `CALL QUERY_FTS_INDEX('Memory', 'memory_fts', $query)
           YIELD node, score
           ${scopeFilter}
           RETURN node.id AS id, node.content AS content, node.type AS type,
                  node.scope AS scope, node.tags AS tags, node.created_at AS created_at, score
           ORDER BY score DESC
           LIMIT $limit`,
          { query, limit, ...(scope ? { scope } : {}) }
        );
      }

      const memories = rows.map((r) => ({
        id:         r.id,
        content:    r.content,
        type:       r.type,
        scope:      r.scope,
        tags:       r.tags,
        created_at: r.created_at,
        score:      r.score,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(memories, null, 2) }],
      };
    }
  );
}
