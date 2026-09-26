import type { PreparedDiagram } from "@archlex/core";
import type { ShareD1 } from "./d1.js";

export const DEFAULT_SHARE_ORIGIN = "https://share.archlex.dev";
export const DEFAULT_PLAYGROUND_ORIGIN = "https://playground.archlex.dev";

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface ShareEnv {
  DB?: ShareD1;
  SHARE_TTL_DAYS?: string;
  SHARE_ORIGIN?: string;
  PLAYGROUND_ORIGIN?: string;
  SHARE_SERVICE_TOKEN?: string;
  SHARE_POST_LIMITER?: RateLimitBinding;
  SHARE_SERVICE_POST_LIMITER?: RateLimitBinding;
  SHARE_RENDER_LIMITER?: RateLimitBinding;
  SHARE_RENDER_GLOBAL_LIMITER?: RateLimitBinding;
  renderSvg?: (source: string) => Promise<string>;
  rasterize?: (svg: string) => Promise<Uint8Array>;
  prepare?: (source: string) => PreparedDiagram | Promise<PreparedDiagram>;
}
