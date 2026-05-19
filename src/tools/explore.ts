import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { driver } from "../db.js";

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
      const session = driver.session();
      try {
        const originResult = await session.run(
          "MATCH (m:Memory {id: $id}) RETURN m",
          { id }
        );

        if (originResult.records.length === 0) {
          return {
            content: [{ type: "text", text: `No memory found with id ${id}.` }],
            isError: true,
          };
        }

        // Variable-length path traversal — no APOC dependency.
        // List comprehension extracts Memory.id (UUID) from each relationship's
        // start/end nodes so edges are human-readable and matchable to node ids.
        const result = await session.run(
          `MATCH (origin:Memory {id: $id})
           OPTIONAL MATCH path = (origin)-[:RELATES_TO*1..${depth}]->(connected:Memory)
           WITH origin,
                collect(DISTINCT connected)       AS connected,
                collect(path)                      AS paths
           RETURN origin,
                  connected,
                  reduce(flat = [], p IN paths |
                    flat + [r IN relationships(p) |
                      {from: startNode(r).id, to: endNode(r).id, relation: r.relation}
                    ]
                  ) AS edges`,
          { id }
        );

        const rec = result.records[0];
        const origin: any = rec.get("origin").properties;
        const connected: any[] = (rec.get("connected") as any[])
          .filter(Boolean)
          .map((n: any) => n.properties);

        // Deduplicate edges (same edge can appear in multiple paths)
        const edgeMap = new Map<string, object>();
        for (const e of (rec.get("edges") as any[]).filter(Boolean)) {
          const key = `${e.from}->${e.to}`;
          if (!edgeMap.has(key)) edgeMap.set(key, e);
        }
        const edges = Array.from(edgeMap.values());

        // Strip embedding vectors — large and not useful to the agent
        const strip = ({ embedding: _, ...rest }: any) => rest;
        const nodes = [origin, ...connected].map(strip);

        return {
          content: [{ type: "text", text: JSON.stringify({ nodes, edges }, null, 2) }],
        };
      } finally {
        await session.close();
      }
    }
  );
}
