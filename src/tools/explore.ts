import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runQuery } from "../db.js";

/** Strip KuzuDB internal fields and the large embedding vector from a node object. */
function nodeProps(node: any): Record<string, unknown> {
  if (!node) return {};
  const { _id, _label, embedding, ...props } = node;
  return props;
}

export function registerExplore(server: McpServer): void {
  server.tool(
    "explore",
    "Traverse the memory graph outward from a starting node. Returns all connected memories " +
    "up to the specified depth. Useful for understanding the full context around a decision, issue, or entity.",
    {
      id: z.string().describe("ID of the memory to start traversal from."),
      depth: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .default(2)
        .describe("How many hops to traverse. Default 2, max 5."),
    },
    async ({ id, depth }) => {
      // Step 1: get the origin node and all reachable nodes up to `depth` hops
      const reachRows = await runQuery(
        `MATCH (origin:Memory {id: $id})
         OPTIONAL MATCH (origin)-[:RELATES_TO*1..${depth}]->(connected:Memory)
         RETURN origin, collect(DISTINCT connected) AS connected`,
        { id }
      );

      if (reachRows.length === 0 || !reachRows[0].origin) {
        return {
          content: [{ type: "text", text: `No memory found with id ${id}.` }],
          isError: true,
        };
      }

      const originNode = nodeProps(reachRows[0].origin);
      const connectedNodes = (reachRows[0].connected as any[])
        .filter(Boolean)
        .map(nodeProps);

      const allIds = [originNode.id as string, ...connectedNodes.map((n) => n.id as string)];

      // Step 2: fetch all RELATES_TO edges among the discovered nodes
      const edgeRows = allIds.length > 1
        ? await runQuery(
            `MATCH (a:Memory)-[r:RELATES_TO]->(b:Memory)
             WHERE a.id IN $ids AND b.id IN $ids
             RETURN a.id AS from_id, r.relation AS relation, b.id AS to_id`,
            { ids: allIds }
          )
        : [];

      const edges = edgeRows.map((r) => ({
        from:     r.from_id,
        relation: r.relation,
        to:       r.to_id,
      }));

      const nodes = [originNode, ...connectedNodes];

      return {
        content: [{ type: "text", text: JSON.stringify({ nodes, edges }, null, 2) }],
      };
    }
  );
}
