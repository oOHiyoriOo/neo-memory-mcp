import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { driver } from "../db.js";

export function registerForget(server: McpServer): void {
  server.tool(
    "forget",
    "Permanently delete a memory and all its relationships.",
    {
      id: z.string().describe("ID of the memory to delete."),
    },
    async ({ id }) => {
      const session = driver.session();
      try {
        const result = await session.run(
          `MATCH (m:Memory {id: $id}) DETACH DELETE m RETURN count(m) AS deleted`,
          { id }
        );

        const deleted = result.records[0]?.get("deleted").toNumber() ?? 0;
        return {
          content: [{
            type: "text",
            text: deleted > 0 ? `Memory ${id} deleted.` : `No memory found with id ${id}.`,
          }],
        };
      } finally {
        await session.close();
      }
    }
  );
}
