import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';
import {
  CHARACTER_LIMIT,
  MAX_CHARACTER_LIMIT,
  READ_ONLY_OPEN_WORLD,
  textResult,
  toolError,
  truncate,
} from '../format';
import type { DeepcrawlClient } from '../types';

export const urlSchema = z
  .string()
  .min(1)
  .describe(
    'Page to fetch. A full URL or a bare domain, e.g. "https://example.com/blog/post" or "example.com".',
  );

export function registerReadTools(server: McpServer, client: DeepcrawlClient) {
  server.registerTool(
    'deepcrawl_read_url',
    {
      title: 'Read URL as Markdown',
      description: `Fetch a web page and return its main content as clean markdown (navigation, ads and boilerplate removed).

Use this to read an article, documentation page, or any public page. To discover which pages a site links to, use deepcrawl_extract_links instead.

Args:
  - url (string): Page to fetch. A full URL or a bare domain.
  - max_chars (number, optional): Maximum characters to return. Default ${CHARACTER_LIMIT}, max ${MAX_CHARACTER_LIMIT}. Longer pages are truncated with a notice; raise this to read more.

Returns: the page content as markdown text.

Errors: an unreachable or blocked URL returns an error; check the URL is public and retry. Results may be served from cache.`,
      inputSchema: {
        url: urlSchema,
        max_chars: z
          .number()
          .int()
          .min(1000)
          .max(MAX_CHARACTER_LIMIT)
          .default(CHARACTER_LIMIT)
          .describe('Maximum characters to return before truncating.'),
      },
      annotations: READ_ONLY_OPEN_WORLD,
    },
    async ({ url, max_chars }) => {
      try {
        const blob = await client.read.getMarkdown({ url });
        const markdown = await blob.text();
        return textResult(
          truncate(markdown, max_chars, 'Call again with a larger max_chars'),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
