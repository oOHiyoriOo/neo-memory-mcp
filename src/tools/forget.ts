import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runQuery } from "../db.js";

export function registerForget(server: McpServer): void {
  server.tool(
    "forget",
    "Permanently delete a memory and all its relationships.",
    {
      id: z.string().describe("ID of the memory to delete."),
    },
    async ({ id }) => {
      // Check existence first so we can give a meaningful response
      const found = await runQuery(
        `MATCH (m:Memory {id: $id}) RETURN m.id AS id`,
        { id }
      );

      if (found.length === 0) {
        return {
          content: [{ type: "text", text: `No memory found with id ${id}.` }],
        };
      }

      await runQuery(`MATCH (m:Memory {id: $id}) DETACH DELETE m`, { id });

      return {
        content: [{ type: "text", text: `Memory ${id} deleted.` }],
      };
    }
  );
}
