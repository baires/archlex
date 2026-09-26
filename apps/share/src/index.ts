import { deleteExpiredPostLimits, deleteExpiredShares } from "./d1.js";
import type { ShareEnv } from "./env.js";
import { handleShareRequest } from "./routes.js";

export default {
  async fetch(
    request: Request,
    env: ShareEnv,
    ctx?: ExecutionContext,
  ): Promise<Response> {
    return handleShareRequest(request, env, ctx);
  },
  async scheduled(
    _controller: ScheduledController,
    env: ShareEnv,
    _ctx: ExecutionContext,
  ): Promise<void> {
    if (!env.DB) return;
    const now = Date.now();
    await deleteExpiredShares(env.DB, now);
    await deleteExpiredPostLimits(env.DB, now);
  },
};
