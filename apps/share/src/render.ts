import type { PreparedDiagram } from "@archlex/core";
import { sanitizeDiagramSvg } from "./sanitize-svg.js";

export const MAX_CONCURRENT_RENDERS = 4;
const MAX_RASTER_DIMENSION = 4096;
const MAX_RASTER_PIXELS = 4_000_000;
const ICON_TIMEOUT_MS = 1500;

let inFlight = 0;

export function resetRenderSlots(): void {
  inFlight = 0;
}

export function acquireRenderSlot(): boolean {
  if (inFlight >= MAX_CONCURRENT_RENDERS) return false;
  inFlight += 1;
  return true;
}

export function releaseRenderSlot(): void {
  inFlight = Math.max(0, inFlight - 1);
}

export async function fetchIconInWorker(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): Promise<Response> {
  return fetchFn(input, {
    ...init,
    redirect: init?.redirect === "error" ? "manual" : init?.redirect,
  });
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

async function bundledFontBuffers(): Promise<Uint8Array[] | undefined> {
  try {
    const [regular, semi] = await Promise.all([
      import("inter-font/ttf/Inter-Regular.ttf"),
      import("inter-font/ttf/Inter-SemiBold.ttf"),
    ]);
    const fonts = [regular.default, semi.default];
    if (
      !fonts.every((font): font is ArrayBuffer => font instanceof ArrayBuffer)
    ) {
      return undefined;
    }
    return fonts.map((font) => new Uint8Array(font));
  } catch {
    return undefined;
  }
}

export async function rasterizeDiagramSvg(svg: string): Promise<Uint8Array> {
  const { Resvg } = await import("@cf-wasm/resvg");
  const fontBuffers = await bundledFontBuffers();
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

export async function renderDiagramSvg(source: string): Promise<string> {
  const [core, aws, gcp, k8s, icons, layout] = await Promise.all([
    import("@archlex/core"),
    import("@archlex/aws"),
    import("@archlex/gcp"),
    import("@archlex/k8s"),
    import("@archlex/icons-core"),
    import("@archlex/layout-elk"),
  ]);
  const archlex = core.createArchLex({
    providers: [core.awsProvider(), core.gcpProvider(), core.k8sProvider()],
    defaultProvider: "aws",
    layoutEngine: layout.createInlineLayoutEngine(),
  });
  const iconLoader = icons.createIconLoader({
    providers: [
      aws.AWS_CDN_PROVIDER,
      gcp.GCP_CDN_PROVIDER,
      k8s.K8S_CDN_PROVIDER,
    ],
    fetchFn: fetchIconInWorker,
  });
  const prepared = archlex.prepare(source);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ICON_TIMEOUT_MS);
  let iconsResult: Awaited<ReturnType<typeof iconLoader.loadIcons>> | undefined;
  try {
    if (prepared.iconRequests.length > 0) {
      iconsResult = await iconLoader.loadIcons(prepared.iconRequests, {
        signal: controller.signal,
      });
    }
  } catch {
    iconsResult = undefined;
  } finally {
    clearTimeout(timeout);
  }
  const result = await archlex.renderPrepared(prepared, {
    icons: iconsResult?.icons,
  });
  return sanitizeDiagramSvg(result.svg);
}

export async function prepareDiagram(source: string): Promise<PreparedDiagram> {
  const core = await import("@archlex/core");
  const archlex = core.createArchLex({
    providers: [core.awsProvider(), core.gcpProvider(), core.k8sProvider()],
    defaultProvider: "aws",
  });
  return archlex.prepare(source);
}
