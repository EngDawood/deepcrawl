import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ORPCError } from '@orpc/server';

/** Maximum characters returned in one tool response text. */
export const CHARACTER_LIMIT = 25_000;
export const MAX_CHARACTER_LIMIT = 200_000;

export const READ_ONLY_OPEN_WORLD = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

/** For tools that only read Deepcrawl's own stored data. */
export const READ_ONLY_CLOSED_WORLD = {
  ...READ_ONLY_OPEN_WORLD,
  openWorldHint: false,
} as const;

/**
 * Cuts `value` to `limit` characters and appends a notice that tells the
 * caller how to get the rest.
 */
export function truncate(value: string, limit: number, hint: string): string {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)}\n\n[Truncated: showing ${limit} of ${value.length} characters. ${hint}]`;
}

export function textResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }] };
}

/** Returns data as both machine-readable `structuredContent` and JSON text. */
export function structuredResult(
  data: Record<string, unknown>,
  text = JSON.stringify(data, null, 2),
): CallToolResult {
  return { content: [{ type: 'text', text }], structuredContent: data };
}

const firstLine = (message: string) =>
  (message.split('\n')[0] ?? message).slice(0, 300);

/**
 * Maps a router error to a message that names the cause and the next step.
 * Stack traces and internal details are dropped.
 */
export function toolError(error: unknown): CallToolResult {
  return { isError: true, ...textResult(`Error: ${describeError(error)}`) };
}

function describeError(error: unknown): string {
  if (!(error instanceof ORPCError)) {
    return 'Unexpected error. Retry once; if it persists, check the URL and try again later.';
  }

  const data = (error.data ?? {}) as { error?: unknown };
  // Drop the internal "reference = <id>" token and trailing periods so the
  // sentence composes cleanly.
  const detail =
    typeof data.error === 'string'
      ? firstLine(data.error)
          .replace(/;\s*reference = [a-z0-9]+/i, '')
          .replace(/\.+$/, '')
      : '';

  switch (error.code) {
    case 'RATE_LIMITED':
      return 'Rate limit exceeded. Wait a minute before calling this tool again.';
    case 'NOT_FOUND':
      return 'No log with that id. List ids with deepcrawl_list_logs; logs are only kept when activity logging is enabled on the worker.';
    case 'READ_ERROR_RESPONSE':
      return `Could not read the page${detail ? `: ${detail}` : ''}. Check the URL is public and reachable, then retry.`;
    case 'LINKS_ERROR_RESPONSE':
      return `Could not extract links${detail ? `: ${detail}` : ''}. Check the URL is public and reachable, then retry.`;
    case 'LOGS_INVALID_DATE_RANGE':
      return 'start_date must be before end_date. Use ISO 8601 timestamps such as 2026-01-31T00:00:00Z.';
    case 'LOGS_INVALID_SORT':
      return 'Invalid sort option. order_by must be one of requestTimestamp, path, requestUrl, success, id.';
    case 'INVALID_EXPORT_FORMAT':
      return `${firstLine(error.message).replace(/\.+$/, '')}. Use "json" for any log, "markdown" for read logs, or "links" for links logs.`;
    case 'BAD_REQUEST':
      return `Invalid input: ${firstLine(error.message)}`;
    default:
      return firstLine(error.message);
  }
}
