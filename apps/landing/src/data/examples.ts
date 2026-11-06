import {
  awsProvider,
  cloudflareProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";
// The playground gallery is the single source of truth for shipped examples.
import {
  ARCHITECTURE_EXAMPLES,
  type ArchitectureExample,
  EXAMPLE_PROVIDER_LABELS,
  type ExampleProvider,
} from "../../../playground/src/examples";

export type { ArchitectureExample, ExampleProvider };
export { EXAMPLE_PROVIDER_LABELS };

const engine = createArchLex({
  providers: [
    awsProvider(),
    cloudflareProvider(),
    gcpProvider(),
    k8sProvider(),
  ],
});

type ServiceInfo = { displayName: string; category?: string };

function catalogServices(provider: string): ServiceInfo[] {
  const catalog = engine.getCatalog(provider) as unknown as {
    providers: Record<string, { services: (ServiceInfo & { id: string })[] }>;
  };
  return catalog.providers[provider]?.services ?? [];
}

const serviceIndex = new Map<string, ServiceInfo>();
for (const provider of ["aws", "cloudflare", "gcp", "k8s"]) {
  for (const service of catalogServices(provider) as (ServiceInfo & {
    id: string;
  })[]) {
    serviceIndex.set(`${provider}:${service.id}`, service);
  }
}

/** Number of catalog entries ArchLex recognizes for a provider. */
export function catalogSize(provider: ExampleProvider): number {
  return catalogServices(provider).length;
}

export type ExampleDetails = {
  resources: { label: string; service: string; provider: string }[];
  relationships: { from: string; kind: string; to: string }[];
  scopes: { kind: string; name: string }[];
};

export type PublishedExample = ArchitectureExample & {
  /** URL path on archlex.dev, with trailing slash. */
  path: string;
  details: ExampleDetails;
};

function describe(source: string): ExampleDetails | null {
  const prepared = engine.prepare(source);
  // Only publish examples that pass provider checks without warnings.
  if (prepared.diagnostics.some((item) => item.severity !== "info"))
    return null;
  const { nodes, edges, scopes } = prepared.graph;
  const labels = new Map(nodes.map((node) => [node.id, node.label]));
  return {
    resources: nodes.map((node) => ({
      label: node.label,
      service:
        serviceIndex.get(`${node.provider}:${node.serviceKind}`)?.displayName ??
        node.serviceKind,
      provider: node.provider,
    })),
    relationships: edges.map((edge) => ({
      from: labels.get(edge.source) ?? edge.source,
      kind: edge.kind ?? "connects",
      to: labels.get(edge.target) ?? edge.target,
    })),
    scopes: scopes.map((scope) => ({ kind: scope.kind, name: scope.name })),
  };
}

export const publishedExamples: PublishedExample[] =
  ARCHITECTURE_EXAMPLES.flatMap((example) => {
    const details = describe(example.source);
    return details
      ? [{ ...example, path: `/examples/${example.id}/`, details }]
      : [];
  });

export function examplesFor(provider: ExampleProvider): PublishedExample[] {
  return publishedExamples.filter((example) => example.provider === provider);
}

export function relatedExamples(
  example: PublishedExample,
  limit = 4,
): PublishedExample[] {
  const others = publishedExamples.filter((item) => item.id !== example.id);
  const sameUseCase = others.filter((item) => item.useCase === example.useCase);
  const sameProvider = others.filter(
    (item) =>
      item.provider === example.provider && item.useCase !== example.useCase,
  );
  return [...sameUseCase, ...sameProvider].slice(0, limit);
}

export type RenderedDiagram = { svg: string; width: number; height: number };

export async function renderExample(
  source: string,
  theme: "light" | "dark",
): Promise<RenderedDiagram> {
  const result = await engine.render(source, { theme });
  const match = result.svg.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/);
  return {
    svg: result.svg,
    width: match ? Math.round(Number(match[1])) : 1200,
    height: match ? Math.round(Number(match[2])) : 600,
  };
}

export function diagramUrl(id: string, theme: "light" | "dark"): string {
  return `/diagrams/examples/${id}-${theme}.svg`;
}
