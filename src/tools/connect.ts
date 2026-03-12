import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { driver } from "../db.js";

export function registerConnect(server: McpServer): void {
  server.tool(
    "connect",
    "Create a named directional relationship between two memories. " +
    "Encodes semantic links like 'caused', 'solved_by', 'relates_to', 'depends_on'.",
    {
      from_id:  z.string().describe("ID of the source memory."),
      to_id:    z.string().describe("ID of the target memory."),
      relation: z.string().describe("Relationship label, e.g. 'caused', 'solved_by', 'depends_on'."),
    },
    async ({ from_id, to_id, relation }) => {
      const session = driver.session();
      try {
        const result = await session.run(
          `MATCH (a:Memory {id: $from_id}), (b:Memory {id: $to_id})
           CREATE (a)-[r:RELATES_TO {relation: $relation, created_at: $created_at}]->(b)
           RETURN a.id AS from, b.id AS to, r.relation AS relation`,
          { from_id, to_id, relation, created_at: new Date().toISOString() }
        );

        if (result.records.length === 0) {
          return {
            content: [{ type: "text", text: "Error: one or both memory IDs not found." }],
            isError: true,
          };
        }

        const r = result.records[0];
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ from: r.get("from"), relation: r.get("relation"), to: r.get("to") }),
          }],
        };
      } finally {
        await session.close();
      }
    }
  );
}
