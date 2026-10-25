import type { RouterClient } from '@orpc/server';
import type { router } from '@/routers';

/** In-process client for the oRPC router, bound to the caller's request context. */
export type DeepcrawlClient = RouterClient<typeof router>;
