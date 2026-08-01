import type { IconRegistry, IconRequest } from "@archlex/icons-core";
import type { CloudGraph } from "@archlex/model";

function iconRequestForNode(
  node: CloudGraph["nodes"][number],
): IconRequest | undefined {
  if (node.icon || !node.iconKey) return undefined;

  const providerPrefix = `${node.provider}.`;
  const key = node.iconKey.startsWith(providerPrefix)
    ? node.iconKey.slice(providerPrefix.length)
    : node.iconKey;

  return key ? { provider: node.provider, key } : undefined;
}

export function collectIconRequests(graph: CloudGraph): readonly IconRequest[] {
  const requests = new Map<string, IconRequest>();

  for (const node of graph.nodes) {
    const request = iconRequestForNode(node);
    if (!request) continue;

    const id = `${request.provider}:${request.key}`;
    if (!requests.has(id)) requests.set(id, request);
  }

  return Array.from(requests.values());
}

export function applyIconRegistry(
  graph: CloudGraph,
  registry: IconRegistry,
): CloudGraph {
  let changed = false;
  const nodes = graph.nodes.map((node) => {
    const request = iconRequestForNode(node);
    if (!request) return node;

    const icon = registry.get(`${request.provider}:${request.key}`);
    if (!icon) return node;

    changed = true;
    return { ...node, icon: icon.svgFragment };
  });

  return changed ? { ...graph, nodes } : graph;
}
