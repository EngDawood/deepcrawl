import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';
import {
  CHARACTER_LIMIT,
  MAX_CHARACTER_LIMIT,
  READ_ONLY_CLOSED_WORLD,
  structuredResult,
  textResult,
  toolError,
  truncate,
} from '../format';
import type { DeepcrawlClient } from '../types';

const LOGGING_NOTE =
  'Logs exist only while activity logging is enabled on the worker (ENABLE_ACTIVITY_LOGS); an empty result can mean logging is off.';

const requestIdSchema = z
  .string()
  .min(1)
  .describe(
    'Request id of the log entry, from deepcrawl_list_logs ("id") or the "requestId" of a read or links result.',
  );

const maxCharsSchema = z
  .number()
  .int()
  .min(1000)
  .max(MAX_CHARACTER_LIMIT)
  .default(CHARACTER_LIMIT)
  .describe('Maximum characters to return before truncating.');

type LogRow = {
  id: string;
  path: string;
  success: boolean;
  requestTimestamp: string;
  requestOptions?: { url?: string };
};

function logsToMarkdown(
  logs: LogRow[],
  meta: { offset: number; hasMore: boolean; nextOffset: number | null },
): string {
  if (logs.length === 0) {
    return `No logs match. ${LOGGING_NOTE}`;
  }
  const rows = logs.map(
    (log) =>
      `| ${log.id} | ${log.requestTimestamp} | ${log.path} | ${log.success ? 'ok' : 'failed'} | ${log.requestOptions?.url ?? ''} |`,
  );
  const more = meta.hasMore
    ? `More available: call again with offset=${meta.nextOffset}.`
    : 'End of results.';
  return [
    `# Activity logs (${logs.length} shown, offset ${meta.offset})`,
    '',
    '| id | time | path | status | url |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
    more,
  ].join('\n');
}

export function registerLogsTools(server: McpServer, client: DeepcrawlClient) {
  server.registerTool(
    'deepcrawl_list_logs',
    {
      title: 'List Activity Logs',
      description: `List past Deepcrawl requests (reads and link extractions), newest first, without their response payloads.

Use this to find a request id, audit what was fetched, or review failures. Then fetch one entry with deepcrawl_get_log or its content with deepcrawl_export_log_response. ${LOGGING_NOTE}

Args:
  - limit (number, optional): Entries per page, 1-100. Default 20.
  - offset (number, optional): Entries to skip, for paging. Default 0.
  - path (string, optional): Only this endpoint: read-getMarkdown, read-readUrl, links-getLinks or links-extractLinks.
  - success (boolean, optional): true for successful requests only, false for failures only.
  - start_date / end_date (ISO 8601, optional): Only requests inside this time range.
  - order_by (string, optional): requestTimestamp (default), path, requestUrl, success or id.
  - order_dir ("asc" | "desc", optional): Default desc.
  - response_format ("markdown" | "json", optional): "markdown" (default) is a compact table; "json" returns the full entries.

Returns: { logs: [...], meta: { limit, offset, hasMore, nextOffset } }. When hasMore is true, call again with offset=nextOffset.`,
      inputSchema: {
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
        path: z
          .enum([
            'read-getMarkdown',
            'read-readUrl',
            'links-getLinks',
            'links-extractLinks',
          ])
          .optional()
          .describe('Only entries from this endpoint.'),
        success: z
          .boolean()
          .optional()
          .describe('true: successes only. false: failures only.'),
        start_date: z.iso
          .datetime()
          .optional()
          .describe('Earliest request time, e.g. "2026-01-31T00:00:00Z".'),
        end_date: z.iso
          .datetime()
          .optional()
          .describe('Latest request time, e.g. "2026-02-01T00:00:00Z".'),
        order_by: z
          .enum(['requestTimestamp', 'path', 'requestUrl', 'success', 'id'])
          .optional()
          .describe('Sort column. Default requestTimestamp.'),
        order_dir: z
          .enum(['asc', 'desc'])
          .optional()
          .describe('Sort direction. Default desc.'),
        response_format: z
          .enum(['markdown', 'json'])
          .default('markdown')
          .describe('"markdown" for a readable table, "json" for full data.'),
      },
      outputSchema: {
        logs: z.array(z.record(z.string(), z.unknown())),
        meta: z.object({
          limit: z.number(),
          offset: z.number(),
          hasMore: z.boolean(),
          nextOffset: z.number().nullable(),
        }),
      },
      annotations: READ_ONLY_CLOSED_WORLD,
    },
    async ({
      response_format,
      start_date,
      end_date,
      order_by,
      order_dir,
      ...rest
    }) => {
      try {
        const result = await client.logs.listLogs({
          ...rest,
          startDate: start_date,
          endDate: end_date,
          orderBy: order_by,
          orderDir: order_dir,
        });
        const data = result as unknown as {
          logs: LogRow[];
          meta: {
            offset: number;
            hasMore: boolean;
            nextOffset: number | null;
          };
        };
        return structuredResult(
          data,
          response_format === 'json'
            ? JSON.stringify(data, null, 2)
            : logsToMarkdown(data.logs, data.meta),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'deepcrawl_get_log',
    {
      title: 'Get Activity Log Entry',
      description: `Fetch one past request, including the original request options and the response it produced.

Use this after deepcrawl_list_logs to inspect a specific request or why it failed. For just the content (markdown or links), deepcrawl_export_log_response is lighter. ${LOGGING_NOTE}

Args:
  - id (string): Request id of the log entry.
  - max_chars (number, optional): Maximum characters to return. Default ${CHARACTER_LIMIT}, max ${MAX_CHARACTER_LIMIT}.

Returns (JSON): the log entry: { id, path, success, requestOptions, requestTimestamp, response }.

Errors: unknown id returns "No log with that id"; use deepcrawl_list_logs to find valid ids.`,
      inputSchema: { id: requestIdSchema, max_chars: maxCharsSchema },
      annotations: READ_ONLY_CLOSED_WORLD,
    },
    async ({ id, max_chars }) => {
      try {
        const entry = await client.logs.getOne({ id });
        return textResult(
          truncate(
            JSON.stringify(entry, null, 2),
            max_chars,
            'Call again with a larger max_chars, or use deepcrawl_export_log_response for the content only',
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'deepcrawl_export_log_response',
    {
      title: 'Export Logged Response',
      description: `Return the stored response of a past request in one format: its markdown, its links, or the full JSON.

Use this to re-read a page or link tree without fetching it again. ${LOGGING_NOTE}

Args:
  - id (string): Request id of the log entry.
  - format ("json" | "markdown" | "links"): "json" works for any entry. "markdown" needs a read entry (read-getMarkdown or read-readUrl). "links" needs a links entry (links-getLinks or links-extractLinks).
  - max_chars (number, optional): Maximum characters to return. Default ${CHARACTER_LIMIT}, max ${MAX_CHARACTER_LIMIT}.

Returns: markdown text for "markdown", JSON text for "json" and "links".

Errors: unknown id returns "No log with that id". A format that does not match the entry's endpoint returns an error naming the valid formats.`,
      inputSchema: {
        id: requestIdSchema,
        format: z
          .enum(['json', 'markdown', 'links'])
          .describe('What to export from the stored response.'),
        max_chars: maxCharsSchema,
      },
      annotations: READ_ONLY_CLOSED_WORLD,
    },
    async ({ id, format, max_chars }) => {
      try {
        const exported = await client.logs.exportResponse({ id, format });
        const text =
          typeof exported === 'string'
            ? exported
            : JSON.stringify(exported, null, 2);
        return textResult(
          truncate(text, max_chars, 'Call again with a larger max_chars'),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
