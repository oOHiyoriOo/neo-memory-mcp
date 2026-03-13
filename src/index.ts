import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { bootstrapSchema } from "./db.js";
import { getEmbedder } from "./embedder.js";
import { registerRemember } from "./tools/remember.js";
import { registerRecall }   from "./tools/recall.js";
import { registerConnect }  from "./tools/connect.js";
import { registerForget }   from "./tools/forget.js";
import { registerExplore }  from "./tools/explore.js";

const server = new McpServer({ name: "neo-memory", version: "1.0.0" });

registerRemember(server);
registerRecall(server);
registerConnect(server);
registerForget(server);
registerExplore(server);

async function main(): Promise<void> {
  await bootstrapSchema();
  console.error("[neo-memory] KuzuDB ready. Schema bootstrapped.");

  // Warm up the embedder without blocking startup
  getEmbedder().then((e) => {
    if (e) console.error("[neo-memory] Embedding model ready.");
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[neo-memory] MCP server running on stdio.");
}

main().catch((err) => {
  console.error("[neo-memory] Fatal:", err);
  process.exit(1);
});
