import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import neo4j from "neo4j-driver";
import { driver } from "../db.js";
import { embed } from "../embedder.js";
import { config } from "../config.js";

export function registerRecall(server: McpServer): void {
  const description = config.memory.scope
    ? `Search memories by semantic similarity in the isolated "${config.memory.scope}" scope. Global and other project memories are excluded.`
    : "Search memories by semantic similarity. Provide a descriptive query — the agent should " +
      "describe what it's looking for in natural language. Optionally filter by project scope.";

  server.tool(
    "recall",
    description,
    {
      query: z
        .string()
        .describe("Natural language search query. Be descriptive for better semantic matching."),
      scope: z
        .string()
        .optional()
        .describe(
          config.memory.scope
            ? "Ignored in isolated server mode; results are always limited to the configured scope."
            : "Limit results to a project scope. Omit to search all memories including global."
        ),
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
        const activeScope = config.memory.scope ?? scope;
        const scopeFilter = activeScope
          ? config.memory.scope
            ? "WHERE m.scope = $scope"
            : "WHERE m.scope = $scope OR m.scope = 'global'"
          : "";
        const scopeParams = activeScope ? { scope: activeScope } : {};
        let records;

        // Neo4j requires true integers — JS numbers serialize as floats (e.g. 10.0) and
        // are rejected by LIMIT and queryNodes.
        const neoLimit      = neo4j.int(limit);
        // Fetch a larger pre-filter window so scope filtering doesn't shrink results below limit.
        const neoFetchLimit = neo4j.int(limit * 10);

        if (queryEmbedding) {
          // Vector similarity — primary path
          const result = await session.run(
            `CALL db.index.vector.queryNodes('memory_vector', $fetchLimit, $embedding)
             YIELD node AS m, score
             ${scopeFilter}
             RETURN m.id AS id, m.content AS content, m.type AS type,
                    m.scope AS scope, m.tags AS tags, m.created_at AS created_at, score
             ORDER BY score DESC
             LIMIT $limit`,
            { embedding: queryEmbedding, fetchLimit: neoFetchLimit, limit: neoLimit, ...scopeParams }
          );
          records = result.records;
        } else {
          // Full-text fallback
          const result = await session.run(
            `CALL db.index.fulltext.queryNodes('memory_fulltext', $query)
             YIELD node AS m, score
             ${scopeFilter}
             RETURN m.id AS id, m.content AS content, m.type AS type,
                    m.scope AS scope, m.tags AS tags, m.created_at AS created_at, score
             ORDER BY score DESC LIMIT $limit`,
            { query, limit: neoLimit, ...scopeParams }
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
