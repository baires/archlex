import type { CloudGraph, LayoutGraph, LayoutOptions } from "@archlex/model";

export function computeGeometryFingerprint(
  graph: CloudGraph,
  options?: LayoutOptions,
): string {
  const nodeSignature = graph.nodes
    .map((n) => `${n.id}:${n.serviceKind}`)
    .sort()
    .join(";");

  const edgeSignature = graph.edges
    .map((e) => `${e.source}->${e.target}:${e.arrow}`)
    .sort()
    .join(";");

  const scopeSignature = graph.scopes
    .map((s) => `${s.id}:${s.kind}:${s.childrenNodeIds.join(",")}`)
    .sort()
    .join(";");

  const direction = options?.direction ?? "LR";
  const raw = `${nodeSignature}|${edgeSignature}|${scopeSignature}|dir:${direction}|elk-v0.12.0-spacing-v4`;

  // Deterministic 32-bit FNV-1a hash formatted as hex
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export class LayoutCache {
  private cache = new Map<string, LayoutGraph>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(fingerprint: string): LayoutGraph | undefined {
    return this.cache.get(fingerprint);
  }

  set(fingerprint: string, graph: LayoutGraph): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(fingerprint, graph);
  }

  clear(): void {
    this.cache.clear();
  }
}
