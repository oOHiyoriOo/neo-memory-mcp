import http from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { driver, bootstrapSchema } from "./db.js";
import { getEmbedder } from "./embedder.js";
import { registerRemember } from "./tools/remember.js";
import { registerRecall }   from "./tools/recall.js";
import { registerConnect }  from "./tools/connect.js";
import { registerForget }   from "./tools/forget.js";
import { registerExplore }  from "./tools/explore.js";
import { config } from "./config.js";

/** Creates a fully-wired McpServer instance with all tools registered. */
function createServer(): McpServer {
  const server = new McpServer({ name: "neo-memory", version: "1.0.0" });
  registerRemember(server);
  registerRecall(server);
  registerConnect(server);
  registerForget(server);
  registerExplore(server);
  return server;
}

async function startStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[neo-memory] MCP server running on stdio.");
}

/**
 * Starts an HTTP daemon so multiple sessions share one Neo4j connection.
 * Each MCP client gets its own session; all sessions share the same process.
 * Connect clients to: http://localhost:<port>/mcp
 */
async function startHttp(port: number): Promise<void> {
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = http.createServer(async (req, res) => {
    if (req.url !== "/mcp") {
      res.writeHead(404).end("Not found");
      return;
    }

    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    // Route existing session to its transport
    if (sessionId) {
      const existing = sessions.get(sessionId);
      if (existing) {
        await existing.handleRequest(req, res);
        return;
      }
      // Unknown session ID — client must re-initialise
      res.writeHead(404).end("Session not found");
      return;
    }

    // New session: create a fresh server + transport pair
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, transport);
        console.error(`[neo-memory] Session started: ${id} (active: ${sessions.size})`);
      },
    });

    transport.onclose = () => {
      const id = transport.sessionId;
      if (id) {
        sessions.delete(id);
        console.error(`[neo-memory] Session closed: ${id} (active: ${sessions.size})`);
      }
    };

    const server = createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  httpServer.listen(port, "127.0.0.1", () => {
    console.error(`[neo-memory] HTTP daemon listening on http://localhost:${port}/mcp`);
    console.error("[neo-memory] All sessions share one Neo4j connection.");
  });
}

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

  if (config.http.port !== undefined) {
    await startHttp(config.http.port);
  } else {
    await startStdio();
  }
}

main().catch((err) => {
  console.error("[neo-memory] Fatal:", err);
  process.exit(1);
});
