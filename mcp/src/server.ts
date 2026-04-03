import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { toolInputShapes, toolOutputShapes } from "./lib/contracts.js";
import { loadToolDescriptors } from "./lib/descriptors.js";
import {
  handleApproveScopeAndStartRecon,
  handleDraftScope,
  handleGetResultsAndExportBundle,
  handleStartDomainVerification,
  handleVerifyDomainControl,
  type ToolContext,
} from "./lib/handlers.js";
import { FixtureBackedStore } from "./lib/store.js";
import { SchemaRegistry } from "./lib/validators.js";

const MCP_PATH = "/mcp";

function buildToolContext(): ToolContext {
  return {
    store: FixtureBackedStore.create(),
    validators: new SchemaRegistry(),
  };
}

const toolHandlers = {
  "witnessops.start_domain_verification": handleStartDomainVerification,
  "witnessops.verify_domain_control": handleVerifyDomainControl,
  "witnessops.draft_scope": handleDraftScope,
  "witnessops.approve_scope_and_start_recon": handleApproveScopeAndStartRecon,
  "witnessops.get_results_and_export_bundle": handleGetResultsAndExportBundle,
} as const;

export async function createAppServer(context = buildToolContext()): Promise<McpServer> {
  const server = new McpServer({
    name: "witnessops-governed-recon",
    version: "0.1.0",
  });

  for (const descriptor of loadToolDescriptors()) {
    const inputSchema = toolInputShapes[descriptor.name as keyof typeof toolInputShapes];
    const outputSchema = toolOutputShapes[descriptor.name as keyof typeof toolOutputShapes];
    const handler = toolHandlers[descriptor.name as keyof typeof toolHandlers];

    server.registerTool(
      descriptor.name,
      {
        title: descriptor.title,
        description: descriptor.description,
        inputSchema,
        outputSchema,
        annotations: descriptor.annotations,
        _meta: {
          confirmationRequired: descriptor.confirmationRequired,
          stateChanging: descriptor.stateChanging,
        },
      },
      async (args: unknown) => handler(context, args),
    );
  }

  return server;
}

export function createHttpServer() {
  const sharedContext = buildToolContext();
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, mcp-session-id",
        "Access-Control-Expose-Headers": "Mcp-Session-Id",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end("witnessops-governed-recon MCP server\n");
      return;
    }

    if (url.pathname === MCP_PATH && req.method && new Set(["GET", "POST", "DELETE"]).has(req.method)) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

      const mcpServer = await createAppServer(sharedContext);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      res.on("close", () => {
        transport.close();
        void mcpServer.close();
      });

      try {
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.writeHead(500).end("Internal server error");
        }
      }
      return;
    }

    res.writeHead(404).end("Not Found");
  });
}
