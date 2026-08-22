import { AWS_CDN_PROVIDER } from "@archlex/aws";
import {
  awsProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";
import { GCP_CDN_PROVIDER } from "@archlex/gcp";
import { type IconLoader, createIconLoader } from "@archlex/icons-core";
import { K8S_CDN_PROVIDER } from "@archlex/k8s";
import { createInlineLayoutEngine } from "@archlex/layout-elk";
import { Resvg } from "@cf-wasm/resvg";
import type { Progress } from "@modelcontextprotocol/server";
import interRegular from "inter-font/ttf/Inter-Regular.ttf";
import interSemiBold from "inter-font/ttf/Inter-SemiBold.ttf";

const archlex = createArchLex({
  providers: [awsProvider(), gcpProvider(), k8sProvider()],
  defaultProvider: "aws",
  layoutEngine: createInlineLayoutEngine(),
});

/** @internal Exported for the Worker compatibility regression test. */
export async function fetchIconInWorker(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): Promise<Response> {
  return fetchFn(input, {
    ...init,
    // Cloudflare Workers intentionally rejects `redirect: "error"`.
    // Manual mode preserves the icon provider's no-redirect security policy:
    // a 3xx response remains non-OK and is rejected by the provider.
    redirect: init?.redirect === "error" ? "manual" : init?.redirect,
  });
}

const defaultIconLoader = createIconLoader({
  providers: [AWS_CDN_PROVIDER, GCP_CDN_PROVIDER, K8S_CDN_PROVIDER],
  fetchFn: fetchIconInWorker,
});

export interface RenderDiagramArgs {
  source: string;
  theme?: "light" | "dark";
  direction?: "LR" | "RL" | "TB" | "BT";
  validation?: "strict" | "normal" | "off";
  format?: "png" | "svg";
}

export interface RenderDiagramOptions {
  enableMcpApps?: boolean;
  signal?: AbortSignal;
  iconLoader?: IconLoader;
  iconHydrationTimeoutMs?: number;
  fontBuffers?: Uint8Array[];
  onProgress?: (progress: Progress) => void;
  rasterizer?: (
    svg: string,
    suppliedFontBuffers?: Uint8Array[],
  ) => Promise<Uint8Array>;
}

const MAX_SOURCE_LENGTH = 100_000;
const MAX_RASTER_DIMENSION = 4096;
const MAX_RASTER_PIXELS = 4_000_000;
const ICON_HYDRATION_TIMEOUT_MS = 1500;

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return btoa(binary);
}

function bundledFontBuffers(): Uint8Array[] | undefined {
  const fonts = [interRegular, interSemiBold];
  if (!fonts.every((font): font is ArrayBuffer => typeof font !== "string")) {
    return undefined;
  }
  return fonts.map((font) => new Uint8Array(font));
}

function rasterScale(svg: string): number {
  const match = svg.match(/\bviewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/);
  if (!match) return 1;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!(width > 0) || !(height > 0)) return 1;
  const scale = Math.min(
    1,
    MAX_RASTER_DIMENSION / width,
    MAX_RASTER_DIMENSION / height,
    Math.sqrt(MAX_RASTER_PIXELS / (width * height)),
  );
  return scale < 1 ? scale * 0.999 : scale;
}

export async function rasterizeSvg(
  svg: string,
  suppliedFontBuffers?: Uint8Array[],
): Promise<Uint8Array> {
  const fontBuffers = suppliedFontBuffers ?? bundledFontBuffers();
  const scale = rasterScale(svg);
  const rasterSvg = fontBuffers
    ? svg.replace(/font-family="[^"]*"/g, 'font-family="Inter"')
    : svg;
  const renderer = await Resvg.async(rasterSvg, {
    font: fontBuffers
      ? {
          fontBuffers,
          defaultFontFamily: "Inter",
          sansSerifFamily: "Inter",
        }
      : { loadSystemFonts: true },
    ...(scale < 1 ? { fitTo: { mode: "zoom" as const, value: scale } } : {}),
  });
  try {
    const rendered = renderer.render();
    try {
      return new Uint8Array(rendered.asPng());
    } finally {
      rendered.free();
    }
  } finally {
    renderer.free();
  }
}

async function loadIconsBeforeDeadline(
  iconLoader: IconLoader,
  requests: Parameters<IconLoader["loadIcons"]>[0],
  timeoutMs: number,
  signal?: AbortSignal,
) {
  const controller = new AbortController();
  const relayAbort = (): void => controller.abort(signal?.reason);
  signal?.addEventListener("abort", relayAbort, { once: true });
  if (signal?.aborted) relayAbort();
  const timeout = setTimeout(
    () =>
      controller.abort(
        new DOMException("Icon hydration timed out", "TimeoutError"),
      ),
    timeoutMs,
  );
  try {
    return await iconLoader.loadIcons(requests, {
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if (signal?.aborted) {
      throw signal.reason ?? error;
    }
    return undefined;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", relayAbort);
  }
}

function formatSourceBlock(source: string): string {
  const longestBacktickRun = Math.max(
    0,
    ...(source.match(/`+/g)?.map((run) => run.length) ?? []),
  );
  const fence = "`".repeat(Math.max(3, longestBacktickRun + 1));
  return `${fence}archlex\n${source}\n${fence}`;
}

export async function handleRenderDiagram(
  args: RenderDiagramArgs,
  options?: RenderDiagramOptions,
) {
  options?.signal?.throwIfAborted();
  const { source, theme, direction, validation, format = "png" } = args;

  if (!source || typeof source !== "string") {
    throw new Error("Missing or invalid required parameter 'source'.");
  }

  if (source.length > MAX_SOURCE_LENGTH) {
    throw new Error(
      `Input source exceeds maximum allowed limit of ${MAX_SOURCE_LENGTH} characters.`,
    );
  }

  options?.onProgress?.({ progress: 1, total: 5, message: "Parsing" });
  const prepared = archlex.prepare(source, { validation });
  options?.onProgress?.({ progress: 2, total: 5, message: "Validating" });
  options?.signal?.throwIfAborted();
  const iconLoader = options?.iconLoader ?? defaultIconLoader;
  const iconLoad =
    prepared.iconRequests.length > 0
      ? await loadIconsBeforeDeadline(
          iconLoader,
          prepared.iconRequests,
          options?.iconHydrationTimeoutMs ?? ICON_HYDRATION_TIMEOUT_MS,
          options?.signal,
        )
      : undefined;
  options?.onProgress?.({
    progress: 3,
    total: 5,
    message: "Hydrating icons",
  });
  options?.signal?.throwIfAborted();
  if (iconLoad?.diagnostics.length) {
    console.warn(
      JSON.stringify({
        event: "icon_hydration_fallback",
        diagnostics: iconLoad.diagnostics,
      }),
    );
  }
  options?.onProgress?.({ progress: 4, total: 5, message: "Laying out" });
  const result = await archlex.renderPrepared(prepared, {
    theme,
    direction,
    icons: iconLoad?.icons,
    signal: options?.signal,
  });
  options?.signal?.throwIfAborted();

  const encodedSource = encodeURIComponent(source);
  const playgroundUrl = `https://playground.archlex.dev/?code=${encodedSource}`;

  const formattedDiagnostics = result.diagnostics.map((d) => ({
    code: d.code,
    severity: d.severity,
    message: d.message,
    span: d.span,
  }));

  const hasErrors = result.diagnostics.some((d) => d.severity === "error");

  // SVG is included for MCP Apps and for clients that request format "svg";
  // direct clients on the default path receive the PNG block only.
  const payload = {
    success: !hasErrors,
    source,
    diagnostics: formattedDiagnostics,
    playground_url: playgroundUrl,
    nodes_count: result.graph.nodes.length,
    edges_count: result.graph.edges.length,
    ...(options?.enableMcpApps || format === "svg" ? { svg: result.svg } : {}),
  };

  // Minimal text summary for agents
  const errorCount = result.diagnostics.filter(
    (d) => d.severity === "error",
  ).length;
  const summary = hasErrors
    ? `✗ Rendering failed: ${errorCount} error${errorCount === 1 ? "" : "s"}`
    : `✓ Rendered successfully: ${result.graph.nodes.length} node${result.graph.nodes.length === 1 ? "" : "s"}, ${result.graph.edges.length} edge${result.graph.edges.length === 1 ? "" : "s"}. Always display or embed the rendered diagram image inline in your response to the user.`;
  const textSummary = `${summary}\n\n${formatSourceBlock(source)}`;

  if (format === "svg") {
    options?.onProgress?.({ progress: 5, total: 5, message: "Rendering" });
    return {
      content: [
        {
          type: "text" as const,
          text: textSummary,
        },
        {
          type: "text" as const,
          text: result.svg,
        },
      ],
      // Structured mirror of the text payload for MCP Apps hosts: the
      // ui://archlex/diagram-viewer iframe renders from this directly.
      structuredContent: payload,
    };
  }

  // Rasterization is the expensive path; SVG-only clients above skipped it.
  options?.signal?.throwIfAborted();
  const rasterizer = options?.rasterizer ?? rasterizeSvg;
  const base64Png = bytesToBase64(
    await rasterizer(result.svg, options?.fontBuffers),
  );
  options?.signal?.throwIfAborted();
  options?.onProgress?.({ progress: 5, total: 5, message: "Rendering" });

  return {
    content: [
      {
        type: "image" as const,
        data: base64Png,
        mimeType: "image/png",
      },
      {
        type: "text" as const,
        text: textSummary,
      },
    ],
    // Structured mirror of the text payload for MCP Apps hosts: the
    // ui://archlex/diagram-viewer iframe renders from this directly.
    structuredContent: payload,
  };
}
