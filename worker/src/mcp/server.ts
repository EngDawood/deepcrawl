import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createRouterClient } from '@orpc/server';
import { z } from 'zod/v4';
import type { ORPCContext } from '@/lib/context';
import { router } from '@/routers';

const urlArg = z
  .string()
  .describe('Page URL. A bare domain such as example.com is accepted.');

const text = (value: string): CallToolResult => ({
  content: [{ type: 'text', text: value }],
});

const failure = (error: unknown): CallToolResult => ({
  isError: true,
  ...text(error instanceof Error ? error.message : 'Unknown error'),
});

/**
 * Builds a per-request MCP server whose tools call the oRPC router in-process,
 * so auth, rate limiting, caching and activity logs match the HTTP API.
 */
export function createMcpServer(context: ORPCContext) {
  const client = createRouterClient(router, { context });
  const server = new McpServer({ name: 'deepcrawl', version: '0.0.1' });

  server.registerTool(
    'read_url',
    {
      description:
        'Fetch a web page and return its main content as markdown. Use for reading articles, docs, or any page by URL.',
      inputSchema: { url: urlArg },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ url }) => {
      try {
        const markdown = await client.read.getMarkdown({ url });
        return text(await markdown.text());
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'extract_links',
    {
      description:
        'Extract the links on a web page as JSON. Set tree to also get a site map tree of the page.',
      inputSchema: {
        url: urlArg,
        tree: z
          .boolean()
          .optional()
          .describe('Build a site map tree. Defaults to false.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ url, tree }) => {
      try {
        const result = await client.links.extractLinks({
          url,
          tree: tree ?? false,
        });
        return text(JSON.stringify(result));
      } catch (error) {
        return failure(error);
      }
    },
  );

  return server;
}
