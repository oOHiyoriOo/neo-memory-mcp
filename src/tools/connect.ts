import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runQuery } from "../db.js";

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
      // Verify both nodes exist before creating the relationship
      const check = await runQuery(
        `MATCH (a:Memory {id: $from_id}), (b:Memory {id: $to_id}) RETURN a.id AS aid, b.id AS bid`,
        { from_id, to_id }
      );

      if (check.length === 0) {
        return {
          content: [{ type: "text", text: "Error: one or both memory IDs not found." }],
          isError: true,
        };
      }

      await runQuery(
        `MATCH (a:Memory {id: $from_id}), (b:Memory {id: $to_id})
         CREATE (a)-[:RELATES_TO {relation: $relation, created_at: $created_at}]->(b)`,
        { from_id, to_id, relation, created_at: new Date().toISOString() }
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ from: from_id, relation, to: to_id }),
        }],
      };
    }
  );
}
