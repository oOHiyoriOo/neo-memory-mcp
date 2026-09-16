import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { driver } from "../db.js";
import { config } from "../config.js";

export function registerForget(server: McpServer): void {
  server.tool(
    "forget",
    "Permanently delete a memory and all its relationships.",
    {
      id: z.string().describe("ID of the memory to delete."),
    },
    async ({ id }) => {
      const session = driver.session();
      const scope = config.memory.scope;
      try {
        const result = await session.run(
          `MATCH (m:Memory {id: $id${scope ? ", scope: $scope" : ""}})
           DETACH DELETE m RETURN count(m) AS deleted`,
          { id, ...(scope ? { scope } : {}) }
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
