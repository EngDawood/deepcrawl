import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRouterClient } from '@orpc/server';
import type { ORPCContext } from '@/lib/context';
import { router } from '@/routers';
import { registerLinksTools } from './tools/links';
import { registerLogsTools } from './tools/logs';
import { registerReadTools } from './tools/read';

/**
 * Builds a per-request MCP server whose tools call the oRPC router in-process,
 * so auth, rate limiting, caching and activity logs match the HTTP API.
 */
export function createMcpServer(context: ORPCContext) {
  const client = createRouterClient(router, { context });
  const server = new McpServer(
    { name: 'deepcrawl-mcp-server', version: '0.0.1' },
    {
      instructions:
        'Deepcrawl reads web pages. Use deepcrawl_read_url for page content, deepcrawl_extract_links to explore a site, and the *_log tools to review past requests.',
    },
  );

  registerReadTools(server, client);
  registerLinksTools(server, client);
  registerLogsTools(server, client);

  return server;
}
