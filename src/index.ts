import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { driver, bootstrapSchema } from "./db.js";
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
  const session = driver.session();
  try {
    await session.run("RETURN 1");
    await bootstrapSchema(session);
    console.error("[neo-memory] Connected to Neo4j. Schema ready.");
  } finally {
    await session.close();
  }

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
