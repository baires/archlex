import { SITE_ROUTES } from "../config";

export const multicloudSource = [
  "direction LR",
  'edge: cloudflare.workers["Cloudflare Workers"]',
  'api: aws.lambda["AWS Lambda"]',
  'events: gcp.pubsub["GCP Pub/Sub"]',
  "cluster production {",
  "  namespace orders {",
  '    app: k8s.deployment["Kubernetes workload"]',
  "  }",
  "}",
  "edge -[proxies]-> api",
  "edge -[publishes]-> events",
  "api -[connects]-> app",
  "events -[connects]-> app",
].join("\n");

export const multicloudPrompt =
  "Diagram Cloudflare Workers proxying requests to AWS Lambda and publishing to GCP Pub/Sub, with both paths connected to a Kubernetes workload. Validate it and give me a playground link.";

export const MCP_ENDPOINT = "https://mcp.archlex.dev/mcp";

export const mcpSetupPrompt = [
  "Set up the ArchLex MCP server in the MCP-capable client or coding-agent environment I am currently using (Claude Code, Cursor, Codex, VS Code/Copilot, or another compatible client).",
  "Use the remote Streamable HTTP endpoint https://mcp.archlex.dev/mcp and name the server archlex. It is free to use and requires no API key, account, or authentication headers.",
  "If this environment does not support MCP, explain that and suggest a compatible client. Otherwise, detect this client's supported setup method and configuration scope. Add or update only the ArchLex entry; preserve all other MCP servers and settings. If you cannot access the configuration, give me the exact client-specific steps instead of claiming it is configured.",
  "Connect to the server and verify that render_diagram, validate_diagram, get_cloud_catalog, and generate_playground_url are available. If a client restart or permission approval is needed, explain what I need to do and verify again afterward.",
  "Once connected, render a small example using render_diagram, show the result if supported, and provide the returned editable playground link. Report any setup or connection errors accurately.",
].join("\n\n");

export const reviewSources = {
  valid: [
    "provider aws",
    "direction LR",
    "",
    'api: api-gateway["API Gateway"]',
    'worker: lambda["Order handler"]',
    'data: dynamodb["Orders"]',
    "",
    "api -[invokes]-> worker",
    "worker -[writes]-> data",
  ].join("\n"),
  warning: [
    "provider aws",
    "direction LR",
    "",
    'api: api-gateway["API Gateway"]',
    'worker: lambda["Order handler"]',
    'data: dynamodb["Orders"]',
    "",
    "api -[invokes]-> worker",
    "worker -[invokes]-> data",
  ].join("\n"),
} as const;

export function exampleUrl(source: string): string {
  const url = new URL(SITE_ROUTES.playground);
  url.searchParams.set("code", source);
  return url.href;
}

export const providers = [
  {
    name: "AWS",
    count: "194 services",
    detail: "Accounts, regions, VPCs and subnets.",
    source: reviewSources.valid,
    docs: "/aws-architecture-diagrams/",
  },
  {
    name: "Cloudflare",
    count: "92 services",
    detail: "Edge services, accounts and origin connections.",
    source:
      "provider cloudflare\ndirection LR\nedge: workers\nstore: d1\nedge -[writes]-> store",
    docs: "/cloudflare-architecture-diagrams/",
  },
  {
    name: "GCP",
    count: "189 services",
    detail: "Google Cloud resources and typed relationships.",
    source:
      "provider gcp\ndirection LR\nservice: cloud-run\nstore: firestore\nservice -[writes]-> store",
    docs: "/gcp-architecture-diagrams/",
  },
  {
    name: "Kubernetes",
    count: "62 resources",
    detail: "Clusters, namespaces and workload relationships.",
    source:
      "provider k8s\ndirection LR\ncluster production {\n  namespace app {\n    service: service\n    app: deployment\n    service -[targets]-> app\n  }\n}",
    docs: "/kubernetes-architecture-diagrams/",
  },
] as const;

export const faqs = [
  {
    q: "What does ArchLex actually validate?",
    a: "Declared diagram rules: known resources, supported scopes and typed relationship endpoints. It checks your architecture description against provider catalogs. It does not inspect a deployed system or certify its security or availability.",
  },
  {
    q: "Can I use it with my coding agent?",
    a: "Yes. ArchLex is built for LLM workflows: connect the free hosted MCP server or install the agent skill. Claude Code, Cursor, Codex and other compatible clients can look up resources, validate source, render diagrams and return an editable playground link.",
  },
  {
    q: "Is the MCP server free?",
    a: "The hosted MCP server is free to use, with no API keys or account required. The playground is free too. ArchLex is open source under the MIT license, and you can also run the CLI or packages locally.",
  },
  {
    q: "Can I use it without an AI agent?",
    a: "Yes. Write a diagram in the playground, render it with the CLI, or embed @archlex/core in a browser or Node.js application. The source is plain text and the output is SVG.",
  },
] as const;

export const setupPaths = [
  {
    id: "mcp",
    label: "Free MCP",
    title: "Connect your agent to the whole picture.",
    description:
      "Give your agent cloud catalogs, semantic validation, diagram rendering and editable playground links. Works with any MCP-compatible client.",
    format: "Streamable HTTP",
    code: MCP_ENDPOINT,
    copyLabel: "Copy MCP URL",
    link: SITE_ROUTES.mcpDocs,
    linkLabel: "Client setup instructions",
  },
  {
    id: "agent",
    label: "Agent skill",
    title: "Teach your agent the language.",
    description:
      "Install the skill, then ask your agent to draw your architecture. It gets the DSL reference, provider rules and working examples.",
    format: "Agent skill · Shell command",
    code: "npx skills add baires/archlex",
    copyLabel: "Copy install command",
    link: SITE_ROUTES.agentsDocs,
    linkLabel: "Agent setup guide",
  },
  {
    id: "browser",
    label: "Playground",
    title: "Keep editing where your agent left off.",
    description:
      "Open the same multicloud source in the playground. Inspect diagnostics, edit relationships and export SVG. Start directly in your browser, with no installation.",
    format: "Editable multicloud source",
    code: multicloudSource,
    copyLabel: "Copy example source",
    link: exampleUrl(multicloudSource),
    linkLabel: "Open multicloud playground",
  },
  {
    id: "package",
    label: "SDK",
    title: "Make diagrams part of your tools.",
    description:
      "Use the same engine in Node.js or the browser. Compose the providers you need and keep the source alongside your code.",
    format: "Node.js + browser · npm",
    code: "npm install @archlex/core @archlex/aws @archlex/cloudflare @archlex/gcp @archlex/k8s",
    copyLabel: "Copy npm command",
    link: "https://docs.archlex.dev/specs/public-api/",
    linkLabel: "Explore the API",
  },
] as const;
